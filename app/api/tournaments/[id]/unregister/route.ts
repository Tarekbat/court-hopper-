import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
      .select('status')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.status !== 'registration_open' && tournament.status !== 'registration_closed') {
      return NextResponse.json({ error: 'Cannot unregister after tournament has started' }, { status: 400 })
    }

    // Find the registration to get team_id before deleting
    const { data: myReg } = await supabase
      .from('tournament_registrations')
      .select('id, team_id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', session.user.id)
      .single()

    if (!myReg) {
      return NextResponse.json({ error: 'Not registered' }, { status: 404 })
    }

    const teamId = myReg.team_id

    // Delete all registrations on this team (covers partner too)
    if (teamId) {
      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('team_id', teamId)

      // Delete the team itself (cascades team_members)
      await supabase
        .from('tournament_teams')
        .delete()
        .eq('id', teamId)
    } else {
      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', myReg.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error in POST /api/tournaments/[id]/unregister:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
