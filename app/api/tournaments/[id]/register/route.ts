import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const registerSchema = z.object({
  division_id: z.string().uuid(),
  partner_user_id: z.string().optional(),
})

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

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'division_id required' }, { status: 400 })
    }

    const { division_id, partner_user_id } = parsed.data

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, registration_opens_at, registration_closes_at, team_size')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.status !== 'registration_open') {
      return NextResponse.json({ error: 'Registration is not open' }, { status: 400 })
    }

    const now = new Date().toISOString()
    if (tournament.registration_opens_at && now < tournament.registration_opens_at) {
      return NextResponse.json({ error: 'Registration has not opened yet' }, { status: 400 })
    }
    if (tournament.registration_closes_at && now > tournament.registration_closes_at) {
      return NextResponse.json({ error: 'Registration has closed' }, { status: 400 })
    }

    const isDoubles = (tournament.team_size ?? 1) === 2
    if (isDoubles && !partner_user_id) {
      return NextResponse.json({ error: 'partner_user_id required for doubles' }, { status: 400 })
    }
    if (isDoubles && partner_user_id === session.user.id) {
      return NextResponse.json({ error: 'You cannot register with yourself as a partner' }, { status: 400 })
    }

    const { data: division } = await supabase
      .from('tournament_divisions')
      .select('id, tournament_id, max_participants')
      .eq('id', division_id)
      .eq('tournament_id', tournamentId)
      .single()

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    // Check capacity (count teams for doubles, registrations for singles)
    let regStatus: 'confirmed' | 'waitlist' = 'confirmed'
    if (division.max_participants) {
      const { count } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('division_id', division_id)
        .eq('status', 'confirmed')
      if ((count ?? 0) >= division.max_participants) {
        regStatus = 'waitlist'
      }
    }

    // For doubles: validate partner exists and is not already registered
    if (isDoubles && partner_user_id) {
      const { data: partnerUser } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', partner_user_id)
        .single()
      if (!partnerUser) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
      }

      const { data: existingPartnerReg } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', partner_user_id)
        .neq('status', 'cancelled')
        .single()
      if (existingPartnerReg) {
        return NextResponse.json({ error: 'Your partner is already registered in this tournament' }, { status: 409 })
      }
    }

    // Check if current user is already registered
    const { data: existingReg } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', session.user.id)
      .neq('status', 'cancelled')
      .single()
    if (existingReg) {
      return NextResponse.json({ error: 'Already registered' }, { status: 409 })
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('tournament_teams')
      .insert({ tournament_id: tournamentId, division_id })
      .select('id')
      .single()

    if (teamError || !team) {
      console.error('Error creating team:', teamError)
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    // Add team members
    const membersToInsert = [{ team_id: team.id, user_id: session.user.id }]
    if (isDoubles && partner_user_id) {
      membersToInsert.push({ team_id: team.id, user_id: partner_user_id })
    }

    const { error: membersError } = await supabase
      .from('tournament_team_members')
      .insert(membersToInsert)

    if (membersError) {
      console.error('Error adding team members:', membersError)
      await supabase.from('tournament_teams').delete().eq('id', team.id)
      return NextResponse.json({ error: 'Failed to add team members' }, { status: 500 })
    }

    // Register current user
    const { data: reg, error: regError } = await supabase
      .from('tournament_registrations')
      .insert({
        tournament_id: tournamentId,
        division_id,
        user_id: session.user.id,
        status: regStatus,
        team_id: team.id,
        partner_user_id: isDoubles ? (partner_user_id ?? null) : null,
      })
      .select()
      .single()

    if (regError) {
      console.error('Error registering:', regError)
      await supabase.from('tournament_teams').delete().eq('id', team.id)
      return NextResponse.json({ error: regError.message }, { status: 500 })
    }

    // For doubles: also register partner
    if (isDoubles && partner_user_id) {
      const { error: partnerRegError } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          division_id,
          user_id: partner_user_id,
          status: regStatus,
          team_id: team.id,
          partner_user_id: session.user.id,
        })

      if (partnerRegError) {
        console.error('Error registering partner:', partnerRegError)
        // Roll back team + primary registration
        await supabase.from('tournament_registrations').delete().eq('id', reg.id)
        await supabase.from('tournament_teams').delete().eq('id', team.id)
        return NextResponse.json({ error: 'Failed to register partner' }, { status: 500 })
      }
    }

    return NextResponse.json({ ...reg, team_id: team.id })
  } catch (err) {
    console.error('Error in POST /api/tournaments/[id]/register:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
