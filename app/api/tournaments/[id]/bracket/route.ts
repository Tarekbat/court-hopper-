import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function resolveTeamNames(
  supabase: any,
  teamIds: string[]
): Promise<Record<string, string>> {
  if (teamIds.length === 0) return {}

  const { data: members } = await supabase
    .from('tournament_team_members')
    .select('team_id, users ( name )')
    .in('team_id', teamIds)

  const byTeam: Record<string, string[]> = {}
  for (const m of members ?? []) {
    if (!byTeam[m.team_id]) byTeam[m.team_id] = []
    if (m.users?.name) byTeam[m.team_id].push(m.users.name)
  }

  const result: Record<string, string> = {}
  for (const [teamId, names] of Object.entries(byTeam)) {
    result[teamId] = names.join(' / ')
  }
  return result
}

function getRoundLabel(round: number, totalRounds: number): string {
  const stepsFromEnd = totalRounds - round
  if (stepsFromEnd === 0) return 'Final'
  if (stepsFromEnd === 1) return 'Semi Finals'
  if (stepsFromEnd === 2) return 'Quarter Finals'
  if (stepsFromEnd === 3) return 'Round of 16'
  if (stepsFromEnd === 4) return 'Round of 32'
  if (stepsFromEnd === 5) return 'Round of 64'
  return `Round ${round}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id: tournamentId } = await params
    const { searchParams } = new URL(request.url)
    const divisionId = searchParams.get('division_id')

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('bracket_type')
      .eq('id', tournamentId)
      .single()

    const isGroupKnockout = tournament?.bracket_type === 'group_knockout'

    // --- Group stage: fetch groups, then all matches + standings in parallel ---
    let groupsData: any[] = []

    if (isGroupKnockout) {
      let groupsQuery = supabase
        .from('tournament_groups')
        .select('id, name, display_order, division_id')
        .eq('tournament_id', tournamentId)
        .order('display_order', { ascending: true })

      if (divisionId) groupsQuery = groupsQuery.eq('division_id', divisionId)

      const { data: groups } = await groupsQuery

      if (groups?.length) {
        // Fetch matches and standings for all groups in parallel
        const groupPromises = (groups as any[]).map(async (group) => {
          const [matchesRes, standingsRes] = await Promise.all([
            supabase
              .from('bracket_matches')
              .select(`
                id, round, match_order, phase, group_id,
                team1_id, team2_id, winner_team_id,
                player1_registration_id, player2_registration_id, winner_registration_id,
                team1_score, team2_score, games_won_1, games_won_2,
                player1_score, player2_score,
                status, result_type, scheduled_at
              `)
              .eq('group_id', group.id)
              .order('match_order', { ascending: true }),
            supabase
              .from('tournament_standings')
              .select('id, team_id, registration_id, matches_won, matches_lost, matches_played, games_differential, points')
              .eq('group_id', group.id)
              .order('matches_won', { ascending: false })
              .order('games_differential', { ascending: false }),
          ])
          return {
            group,
            matches: matchesRes.data ?? [],
            standings: standingsRes.data ?? [],
          }
        })

        const groupResults = await Promise.all(groupPromises)

        // Collect all team IDs and reg IDs once
        const allTeamIds = new Set<string>()
        const allRegIds = new Set<string>()
        for (const { matches, standings } of groupResults) {
          for (const m of matches) {
            if (m.team1_id) allTeamIds.add(m.team1_id)
            if (m.team2_id) allTeamIds.add(m.team2_id)
            if (m.winner_team_id) allTeamIds.add(m.winner_team_id)
          }
          for (const s of standings) {
            if (s.team_id) allTeamIds.add(s.team_id)
            if (s.registration_id) allRegIds.add(s.registration_id)
          }
        }

        const [teamNames, regNames] = await Promise.all([
          resolveTeamNames(supabase, Array.from(allTeamIds)),
          allRegIds.size > 0
            ? supabase
                .from('tournament_registrations')
                .select('id, users ( name )')
                .in('id', Array.from(allRegIds))
                .then(({ data: regs }) => {
                  const map: Record<string, string> = {}
                  for (const r of regs ?? []) {
                    if ((r as any).users?.name) map[(r as any).id] = (r as any).users.name
                  }
                  return map
                })
            : Promise.resolve({} as Record<string, string>),
        ])

        groupsData = groupResults.map(({ group, matches, standings }) => ({
          id: group.id,
          name: group.name,
          division_id: group.division_id,
          display_order: group.display_order,
          matches: matches.map((m: any) => ({
            id: m.id,
            status: m.status,
            result_type: m.result_type,
            scheduled_at: m.scheduled_at,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            winner_team_id: m.winner_team_id,
            team1_name: m.team1_id ? (teamNames[m.team1_id] ?? 'TBD') : null,
            team2_name: m.team2_id ? (teamNames[m.team2_id] ?? 'TBD') : null,
            winner_name: m.winner_team_id ? (teamNames[m.winner_team_id] ?? null) : null,
            team1_score: m.team1_score,
            team2_score: m.team2_score,
            games_won_1: m.games_won_1,
            games_won_2: m.games_won_2,
          })),
          standings: standings.map((s: any) => ({
            id: s.id,
            team_id: s.team_id,
            name: s.team_id
              ? (teamNames[s.team_id] ?? 'Unknown')
              : (s.registration_id ? (regNames[s.registration_id] ?? 'Unknown') : 'Unknown'),
            wins: s.matches_won,
            losses: s.matches_lost,
            played: s.matches_played,
            games_differential: s.games_differential,
          })),
        }))
      }
    }

    // --- Knockout: fetch brackets, then all bracket matches in parallel ---
    let bracketsResult: any[] = []

    let bracketsQuery = supabase
      .from('brackets')
      .select('id, division_id, tournament_divisions ( id, name )')
      .eq('tournament_id', tournamentId)

    if (divisionId) bracketsQuery = bracketsQuery.eq('division_id', divisionId)

    const { data: brackets } = await bracketsQuery

    if (brackets?.length) {
      const bracketMatchesPromises = (brackets as any[]).map((b) =>
        supabase
          .from('bracket_matches')
          .select(`
            id, round, match_order, phase,
            team1_id, team2_id, winner_team_id,
            player1_registration_id, player2_registration_id, winner_registration_id,
            team1_score, team2_score, games_won_1, games_won_2,
            player1_score, player2_score,
            status, result_type, scheduled_at
          `)
          .eq('bracket_id', b.id)
          .order('round', { ascending: true })
          .order('match_order', { ascending: true })
      )

      const bracketMatchesResults = await Promise.all(bracketMatchesPromises)

      const allKnockoutTeamIds = new Set<string>()
      const allKnockoutRegIds = new Set<string>()
      for (const { data: matches } of bracketMatchesResults) {
        for (const m of matches ?? []) {
          if (m.team1_id) allKnockoutTeamIds.add(m.team1_id)
          if (m.team2_id) allKnockoutTeamIds.add(m.team2_id)
          if (m.winner_team_id) allKnockoutTeamIds.add(m.winner_team_id)
          if (m.player1_registration_id) allKnockoutRegIds.add(m.player1_registration_id)
          if (m.player2_registration_id) allKnockoutRegIds.add(m.player2_registration_id)
          if (m.winner_registration_id) allKnockoutRegIds.add(m.winner_registration_id)
        }
      }

      const [knockoutTeamNames, knockoutRegNames] = await Promise.all([
        resolveTeamNames(supabase, Array.from(allKnockoutTeamIds)),
        allKnockoutRegIds.size > 0
          ? supabase
              .from('tournament_registrations')
              .select('id, user_id, users ( name )')
              .in('id', Array.from(allKnockoutRegIds))
              .then(({ data: regs }) => {
                const map: Record<string, string> = {}
                for (const r of regs ?? []) {
                  map[(r as any).id] = (r as any).users?.name ?? 'Unknown'
                }
                return map
              })
          : Promise.resolve({} as Record<string, string>),
      ])

      bracketsResult = (brackets as any[]).map((b, idx) => {
        const matches = bracketMatchesResults[idx].data ?? []
        const maxRound = Math.max(...matches.map((m: any) => m.round), 0)
        const byRound: Record<number, any[]> = {}
        for (const m of matches) {
          if (!byRound[m.round]) byRound[m.round] = []
          const isTeamBased = !!(m.team1_id || m.team2_id)
          byRound[m.round].push({
            id: m.id,
            round: m.round,
            match_order: m.match_order,
            status: m.status,
            result_type: m.result_type,
            scheduled_at: m.scheduled_at,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            winner_team_id: m.winner_team_id,
            team1_name: m.team1_id ? (knockoutTeamNames[m.team1_id] ?? 'TBD') : null,
            team2_name: m.team2_id ? (knockoutTeamNames[m.team2_id] ?? 'TBD') : null,
            winner_name: m.winner_team_id ? (knockoutTeamNames[m.winner_team_id] ?? null) : null,
            team1_score: m.team1_score,
            team2_score: m.team2_score,
            games_won_1: m.games_won_1,
            games_won_2: m.games_won_2,
            player1_registration_id: isTeamBased ? null : m.player1_registration_id,
            player2_registration_id: isTeamBased ? null : m.player2_registration_id,
            player1_name: isTeamBased ? null : (m.player1_registration_id ? (knockoutRegNames[m.player1_registration_id] ?? 'TBD') : null),
            player2_name: isTeamBased ? null : (m.player2_registration_id ? (knockoutRegNames[m.player2_registration_id] ?? 'TBD') : null),
            player1_score: isTeamBased ? null : m.player1_score,
            player2_score: isTeamBased ? null : m.player2_score,
          })
        }
        const roundsWithLabels: Record<number, { label: string; matches: any[] }> = {}
        for (const [roundNum, roundMatches] of Object.entries(byRound)) {
          const r = Number(roundNum)
          roundsWithLabels[r] = { label: getRoundLabel(r, maxRound), matches: roundMatches }
        }
        return {
          bracket_id: b.id,
          division_id: b.division_id,
          division_name: (b.tournament_divisions as any)?.name ?? 'Division',
          rounds: roundsWithLabels,
        }
      })
    }

    if (divisionId) {
      return NextResponse.json({
        division_id: divisionId,
        groups: groupsData,
        bracket: bracketsResult[0] ?? null,
      })
    }

    return NextResponse.json({
      groups: groupsData,
      brackets: bracketsResult,
    })
  } catch (err) {
    console.error('Error in GET /api/tournaments/[id]/bracket:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
