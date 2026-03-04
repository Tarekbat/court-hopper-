import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

// Given sorted group standings, produces a seeded knockout bracket
// Standard cross-seeding: A1 vs B2, B1 vs A2, then winners meet in SF, etc.
function seedKnockout(groupStandings: { groupName: string; teams: string[] }[]): Array<[string | null, string | null]> {
  const seeds: Array<string | null> = []
  // Interleave: A1, B1, C1... then A2, B2...
  const maxPerGroup = Math.max(...groupStandings.map((g) => g.teams.length))
  for (let rank = 0; rank < maxPerGroup; rank++) {
    for (const group of groupStandings) {
      if (group.teams[rank]) seeds.push(group.teams[rank])
    }
  }

  // Build bracket size to next power of 2
  const n = seeds.length
  const size = nextPowerOf2(n)
  // Pad with nulls (byes)
  while (seeds.length < size) seeds.push(null)

  // Pair them: 1 vs last, 2 vs second-last... (standard seeding)
  const pairs: Array<[string | null, string | null]> = []
  for (let i = 0; i < size / 2; i++) {
    pairs.push([seeds[i], seeds[size - 1 - i]])
  }
  return pairs
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id: tournamentId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, organizer_id, status, bracket_type')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (tournament.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (tournament.status !== 'live') {
      return NextResponse.json({ error: 'Tournament must be live to generate knockout' }, { status: 400 })
    }
    if (tournament.bracket_type !== 'group_knockout') {
      return NextResponse.json({ error: 'This tournament does not use group stage' }, { status: 400 })
    }

    const { data: divisions } = await supabase
      .from('tournament_divisions')
      .select('id, name')
      .eq('tournament_id', tournamentId)

    for (const div of divisions ?? []) {
      // Check existing knockout bracket for this division
      const { data: existingBracket } = await supabase
        .from('brackets')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('division_id', div.id)
        .single()

      if (existingBracket) continue

      // Check all group matches are completed
      const { data: pendingMatches } = await supabase
        .from('bracket_matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('phase', 'group')
        .neq('status', 'completed')
        .in('group_id',
          (await supabase
            .from('tournament_groups')
            .select('id')
            .eq('division_id', div.id)
          ).data?.map((g: any) => g.id) ?? []
        )

      if (pendingMatches && pendingMatches.length > 0) {
        return NextResponse.json({
          error: `${pendingMatches.length} group match(es) are still pending for division "${div.name}". Complete all group matches first.`,
        }, { status: 400 })
      }

      // Get groups ordered by display_order
      const { data: groups } = await supabase
        .from('tournament_groups')
        .select('id, name, display_order')
        .eq('division_id', div.id)
        .order('display_order', { ascending: true })

      if (!groups || groups.length === 0) continue

      // Get final standings per group, sorted by wins then games_differential
      const groupStandings: { groupName: string; teams: string[] }[] = []

      for (const group of groups) {
        const { data: standings } = await supabase
          .from('tournament_standings')
          .select('team_id, matches_won, games_differential')
          .eq('group_id', group.id)
          .order('matches_won', { ascending: false })
          .order('games_differential', { ascending: false })

        groupStandings.push({
          groupName: group.name,
          teams: (standings ?? []).map((s: any) => s.team_id).filter(Boolean),
        })
      }

      const pairs = seedKnockout(groupStandings)
      if (pairs.length === 0) continue

      // Create bracket
      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .insert({ tournament_id: tournamentId, division_id: div.id })
        .select('id')
        .single()

      if (bracketError || !bracket) {
        console.error('Error creating bracket:', bracketError)
        return NextResponse.json({ error: 'Failed to create knockout bracket' }, { status: 500 })
      }

      // Insert round 1 matches
      for (let i = 0; i < pairs.length; i++) {
        const [t1, t2] = pairs[i]
        const isBye = !t1 || !t2
        const { error: matchError } = await supabase
          .from('bracket_matches')
          .insert({
            tournament_id: tournamentId,
            bracket_id: bracket.id,
            round: 1,
            match_order: i,
            phase: 'knockout',
            team1_id: t1 ?? null,
            team2_id: t2 ?? null,
            status: isBye ? 'bye' : 'pending',
          })

        if (matchError) {
          console.error('Error inserting knockout match:', matchError)
          return NextResponse.json({ error: 'Failed to create knockout matches' }, { status: 500 })
        }

        // If bye, auto-advance the non-null team
        if (isBye) {
          const advancingTeam = t1 ?? t2
          const nextRound = 2
          const nextMatchOrder = Math.floor(i / 2)
          const slot = i % 2 === 0 ? 'team1_id' : 'team2_id'

          // Check if next match already exists (it may not yet — create it after all r1 inserted)
          // We'll handle this in a second pass below
          void advancingTeam; void nextRound; void nextMatchOrder; void slot
        }
      }

      // Insert subsequent empty rounds
      let matchesInRound = pairs.length / 2
      let round = 2
      while (matchesInRound >= 1) {
        for (let i = 0; i < matchesInRound; i++) {
          const { error: insertErr } = await supabase
            .from('bracket_matches')
            .insert({
              tournament_id: tournamentId,
              bracket_id: bracket.id,
              round,
              match_order: i,
              phase: 'knockout',
              team1_id: null,
              team2_id: null,
              status: 'pending',
            })
          if (insertErr) {
            console.error('Error inserting future round match:', insertErr)
            return NextResponse.json({ error: 'Failed to create future round matches' }, { status: 500 })
          }
        }
        matchesInRound = Math.floor(matchesInRound / 2)
        round++
      }

      // Second pass: advance bye winners
      for (let i = 0; i < pairs.length; i++) {
        const [t1, t2] = pairs[i]
        if (!t1 || !t2) {
          const advancingTeam = t1 ?? t2
          const nextMatchOrder = Math.floor(i / 2)
          const slot = i % 2 === 0 ? 'team1_id' : 'team2_id'

          const { data: nextMatch } = await supabase
            .from('bracket_matches')
            .select('id')
            .eq('bracket_id', bracket.id)
            .eq('round', 2)
            .eq('match_order', nextMatchOrder)
            .single()

          if (nextMatch) {
            await supabase
              .from('bracket_matches')
              .update({ [slot]: advancingTeam })
              .eq('id', nextMatch.id)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error in POST generate-knockout:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
