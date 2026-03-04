import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function resolveTeamNamesBatch(
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
    const groupId = searchParams.get('group_id')

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('tournament_standings')
      .select(`
        id,
        division_id,
        group_id,
        registration_id,
        team_id,
        points,
        matches_played,
        matches_won,
        matches_drawn,
        matches_lost,
        sets_won,
        games_won,
        games_differential,
        tournament_registrations ( user_id, users ( name, image ) )
      `)
      .eq('tournament_id', tournamentId)
      .order('matches_won', { ascending: false })
      .order('games_differential', { ascending: false })
      .order('matches_played', { ascending: true })

    if (divisionId) query = query.eq('division_id', divisionId)
    if (groupId) query = query.eq('group_id', groupId)

    const { data: rows, error } = await query

    if (error) {
      console.error('Error fetching standings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teamIds = [...new Set((rows ?? []).map((r: any) => r.team_id).filter(Boolean))]
    const teamNamesMap = await resolveTeamNamesBatch(supabase, teamIds)

    const list = (rows ?? []).map((r: any) => {
      let teamName: string | null = null
      let teamImage: string | null = null

      if (r.team_id) {
        teamName = teamNamesMap[r.team_id] ?? 'Unknown'
      } else if (r.tournament_registrations) {
        teamName = r.tournament_registrations?.users?.name ?? null
        teamImage = r.tournament_registrations?.users?.image ?? null
      }

      return {
        id: r.id,
        division_id: r.division_id,
        group_id: r.group_id,
        registration_id: r.registration_id,
        team_id: r.team_id,
        points: r.points,
        matches_played: r.matches_played,
        matches_won: r.matches_won,
        matches_drawn: r.matches_drawn,
        matches_lost: r.matches_lost,
        sets_won: r.sets_won,
        games_won: r.games_won,
        games_differential: r.games_differential,
        name: teamName,
        image: teamImage,
      }
    })

    return NextResponse.json(list)
  } catch (err) {
    console.error('Error in GET /api/tournaments/[id]/standings:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
