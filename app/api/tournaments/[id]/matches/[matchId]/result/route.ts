import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id: tournamentId, matchId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, organizer_id')
      .eq('id', tournamentId)
      .single()

    if (!tournament || tournament.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      winner_team_id,
      team1_score,
      team2_score,
      games_won_1,
      games_won_2,
      result_type = 'normal',
      // Legacy single-player fields (for backward compatibility)
      winner_registration_id,
      player1_score,
      player2_score,
    } = body

    // Fetch the match
    const { data: match, error: matchError } = await supabase
      .from('bracket_matches')
      .select('id, bracket_id, round, match_order, phase, group_id, team1_id, team2_id, player1_registration_id, player2_registration_id, status, tournament_id')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Verify match belongs to this tournament
    const matchTournamentId = match.tournament_id ?? (match.bracket_id
      ? (await supabase.from('brackets').select('tournament_id').eq('id', match.bracket_id).single()).data?.tournament_id
      : null)

    if (matchTournamentId !== tournamentId) {
      return NextResponse.json({ error: 'Match does not belong to this tournament' }, { status: 403 })
    }

    if (match.status === 'completed') {
      return NextResponse.json({ error: 'Match already completed' }, { status: 400 })
    }

    const isTeamBased = !!(match.team1_id || match.team2_id)

    if (isTeamBased) {
      // Team-based result
      if (!winner_team_id) {
        return NextResponse.json({ error: 'winner_team_id required' }, { status: 400 })
      }
      if (winner_team_id !== match.team1_id && winner_team_id !== match.team2_id) {
        return NextResponse.json({ error: 'winner_team_id must be one of the competing teams' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('bracket_matches')
        .update({
          status: 'completed',
          winner_team_id,
          team1_score: team1_score ?? null,
          team2_score: team2_score ?? null,
          games_won_1: games_won_1 ?? null,
          games_won_2: games_won_2 ?? null,
          result_type,
        })
        .eq('id', matchId)

      if (updateError) {
        console.error('Error updating match:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      if (match.phase === 'group' && match.group_id) {
        // Update standings for both teams
        const loser_team_id = winner_team_id === match.team1_id ? match.team2_id : match.team1_id
        const g1 = games_won_1 ?? 0
        const g2 = games_won_2 ?? 0

        // Winner standings
        if (match.team1_id) {
          const winnerIsTeam1 = winner_team_id === match.team1_id
          const winnerGames = winnerIsTeam1 ? g1 : g2
          const loserGames = winnerIsTeam1 ? g2 : g1

          try {
            await supabase.rpc('update_group_standings', {
              p_group_id: match.group_id,
              p_team_id: winner_team_id,
              p_won: true,
              p_games_for: winnerGames,
              p_games_against: loserGames,
            })
          } catch {
            // RPC may not exist; fallback below
          }

          // Manual fallback: fetch and update standings directly
          const { data: winnerRow } = await supabase
            .from('tournament_standings')
            .select('id, matches_played, matches_won, matches_lost, games_won, games_differential, points')
            .eq('group_id', match.group_id)
            .eq('team_id', winner_team_id)
            .single()

          if (winnerRow) {
            await supabase
              .from('tournament_standings')
              .update({
                matches_played: winnerRow.matches_played + 1,
                matches_won: winnerRow.matches_won + 1,
                games_won: winnerRow.games_won + winnerGames,
                games_differential: winnerRow.games_differential + winnerGames - loserGames,
                points: winnerRow.points + 3,
              })
              .eq('id', winnerRow.id)
          }

          if (loser_team_id) {
            const { data: loserRow } = await supabase
              .from('tournament_standings')
              .select('id, matches_played, matches_won, matches_lost, games_won, games_differential, points')
              .eq('group_id', match.group_id)
              .eq('team_id', loser_team_id)
              .single()

            if (loserRow) {
              await supabase
                .from('tournament_standings')
                .update({
                  matches_played: loserRow.matches_played + 1,
                  matches_lost: loserRow.matches_lost + 1,
                  games_won: loserRow.games_won + loserGames,
                  games_differential: loserRow.games_differential + loserGames - winnerGames,
                })
                .eq('id', loserRow.id)
            }
          }
        }
      } else if (match.phase === 'knockout' && match.bracket_id) {
        // Advance winner to next round
        const nextRound = match.round + 1
        const nextMatchOrder = Math.floor(match.match_order / 2)
        const slot = match.match_order % 2 === 0 ? 'team1_id' : 'team2_id'

        const { data: nextMatch } = await supabase
          .from('bracket_matches')
          .select('id')
          .eq('bracket_id', match.bracket_id)
          .eq('round', nextRound)
          .eq('match_order', nextMatchOrder)
          .single()

        if (nextMatch) {
          await supabase
            .from('bracket_matches')
            .update({ [slot]: winner_team_id })
            .eq('id', nextMatch.id)
        }
      }
    } else {
      // Legacy single-player result (single_elimination tournaments)
      if (!winner_registration_id) {
        return NextResponse.json({ error: 'winner_registration_id required' }, { status: 400 })
      }
      if (winner_registration_id !== match.player1_registration_id && winner_registration_id !== match.player2_registration_id) {
        return NextResponse.json({ error: 'winner must be one of the players' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('bracket_matches')
        .update({
          status: 'completed',
          player1_score: player1_score ?? null,
          player2_score: player2_score ?? null,
          winner_registration_id,
        })
        .eq('id', matchId)

      if (updateError) {
        console.error('Error updating match:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      if (match.bracket_id) {
        // Advance winner to next round slot (fixed: slot 0 → team1, slot 1 → team2)
        const nextRound = match.round + 1
        const nextMatchOrder = Math.floor(match.match_order / 2)
        const slot = match.match_order % 2 === 0 ? 'player1_registration_id' : 'player2_registration_id'

        const { data: nextMatch } = await supabase
          .from('bracket_matches')
          .select('id')
          .eq('bracket_id', match.bracket_id)
          .eq('round', nextRound)
          .eq('match_order', nextMatchOrder)
          .single()

        if (nextMatch) {
          await supabase
            .from('bracket_matches')
            .update({ [slot]: winner_registration_id })
            .eq('id', nextMatch.id)
        }
      }

      // Update standings
      const winnerId = winner_registration_id
      const loserId = winnerId === match.player1_registration_id
        ? match.player2_registration_id
        : match.player1_registration_id

      if (match.bracket_id) {
        const { data: bracket } = await supabase
          .from('brackets')
          .select('tournament_id, division_id')
          .eq('id', match.bracket_id)
          .single()

        if (bracket) {
          // Winner
          const { data: ws } = await supabase
            .from('tournament_standings')
            .select('id, points, matches_played, matches_won')
            .eq('tournament_id', bracket.tournament_id)
            .eq('division_id', bracket.division_id)
            .eq('registration_id', winnerId)
            .single()
          if (ws) {
            await supabase
              .from('tournament_standings')
              .update({ points: ws.points + 3, matches_played: ws.matches_played + 1, matches_won: ws.matches_won + 1 })
              .eq('id', ws.id)
          }
          // Loser
          if (loserId) {
            const { data: ls } = await supabase
              .from('tournament_standings')
              .select('id, matches_played')
              .eq('tournament_id', bracket.tournament_id)
              .eq('division_id', bracket.division_id)
              .eq('registration_id', loserId)
              .single()
            if (ls) {
              await supabase
                .from('tournament_standings')
                .update({ matches_played: ls.matches_played + 1 })
                .eq('id', ls.id)
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error in POST result:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
