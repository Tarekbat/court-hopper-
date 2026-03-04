import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Snake-seed teams across groups: e.g. 8 teams, 2 groups
// Round 1: A=1, B=2 | Round 2: B=3, A=4 | Round 3: A=5, B=6 | ...
function snakeSeed(teams: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => [])
  let dir = 1
  let g = 0
  for (const team of teams) {
    groups[g].push(team)
    g += dir
    if (g >= groupCount) { g = groupCount - 1; dir = -1 }
    else if (g < 0) { g = 0; dir = 1 }
  }
  return groups
}

// Generate all round-robin pairs within a group
function roundRobinPairs(teamIds: string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i], teamIds[j]])
    }
  }
  return pairs
}

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

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
      .select('id, organizer_id, status, bracket_type, groups_count')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (tournament.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (tournament.status !== 'registration_closed') {
      return NextResponse.json({ error: 'Close registration before setting up groups' }, { status: 400 })
    }
    if (tournament.bracket_type !== 'group_knockout') {
      return NextResponse.json({ error: 'This tournament does not use group stage' }, { status: 400 })
    }

    const groupCount = tournament.groups_count ?? 2

    const { data: divisions } = await supabase
      .from('tournament_divisions')
      .select('id, name')
      .eq('tournament_id', tournamentId)

    for (const div of divisions ?? []) {
      // Check if groups already exist
      const { data: existingGroups } = await supabase
        .from('tournament_groups')
        .select('id')
        .eq('division_id', div.id)
        .limit(1)

      if (existingGroups && existingGroups.length > 0) continue

      // Get all confirmed teams for this division
      const { data: regs } = await supabase
        .from('tournament_registrations')
        .select('team_id')
        .eq('division_id', div.id)
        .eq('status', 'confirmed')

      const teamIds = [...new Set((regs ?? []).map((r: any) => r.team_id).filter(Boolean))]

      if (teamIds.length < 2) continue

      const groupedTeams = snakeSeed(teamIds, Math.min(groupCount, teamIds.length))

      for (let gi = 0; gi < groupedTeams.length; gi++) {
        const groupTeams = groupedTeams[gi]
        if (groupTeams.length === 0) continue

        // Create group
        const { data: group, error: groupError } = await supabase
          .from('tournament_groups')
          .insert({
            tournament_id: tournamentId,
            division_id: div.id,
            name: GROUP_NAMES[gi] ?? `Group ${gi + 1}`,
            display_order: gi,
          })
          .select('id')
          .single()

        if (groupError || !group) {
          console.error('Error creating group:', groupError)
          return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
        }

        // Add teams to group
        const groupTeamRows = groupTeams.map((tid) => ({ group_id: group.id, team_id: tid }))
        const { error: gtError } = await supabase
          .from('tournament_group_teams')
          .insert(groupTeamRows)

        if (gtError) {
          console.error('Error adding teams to group:', gtError)
          return NextResponse.json({ error: 'Failed to assign teams to group' }, { status: 500 })
        }

        // Generate round-robin matches
        const pairs = roundRobinPairs(groupTeams)
        for (let pi = 0; pi < pairs.length; pi++) {
          const [t1, t2] = pairs[pi]
          const { error: matchError } = await supabase
            .from('bracket_matches')
            .insert({
              tournament_id: tournamentId,
              round: 1,
              match_order: pi,
              phase: 'group',
              group_id: group.id,
              team1_id: t1,
              team2_id: t2,
              status: 'pending',
            })

          if (matchError) {
            console.error('Error creating group match:', matchError)
            return NextResponse.json({ error: 'Failed to create group matches' }, { status: 500 })
          }
        }

        // Seed empty standings rows for each team
        const standingsRows = groupTeams.map((tid) => ({
          tournament_id: tournamentId,
          division_id: div.id,
          group_id: group.id,
          team_id: tid,
          registration_id: (regs ?? []).find((r: any) => r.team_id === tid)?.id ?? null,
          points: 0,
          matches_played: 0,
          matches_won: 0,
          matches_drawn: 0,
          matches_lost: 0,
          sets_won: 0,
          games_won: 0,
          games_differential: 0,
        }))

        const { error: standingsError } = await supabase
          .from('tournament_standings')
          .insert(standingsRows)

        if (standingsError) {
          console.error('Error creating standings:', standingsError)
          return NextResponse.json({ error: 'Failed to seed standings' }, { status: 500 })
        }
      }
    }

    // Update tournament status to live
    await supabase
      .from('tournaments')
      .update({ status: 'live' })
      .eq('id', tournamentId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error in POST generate-groups:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
