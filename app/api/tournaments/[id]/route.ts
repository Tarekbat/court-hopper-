import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tournament, error: tError } = await supabase
      .from('tournaments')
      .select(`
        id,
        name,
        description,
        sport_id,
        organizer_id,
        registration_opens_at,
        registration_closes_at,
        starts_at,
        ends_at,
        status,
        bracket_type,
        team_size,
        groups_count,
        max_participants,
        location,
        created_at,
        sports ( id, slug, name, icon )
      `)
      .eq('id', id)
      .single()

    if (tError || !tournament) {
      if (tError?.code === 'PGRST116') return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      console.error('Error fetching tournament:', tError)
      return NextResponse.json({ error: tError?.message ?? 'Failed to fetch' }, { status: 500 })
    }

    const { data: divisions } = await supabase
      .from('tournament_divisions')
      .select('id, name, skill_level_min, skill_level_max, max_participants')
      .eq('tournament_id', id)
      .order('name')

    const divisionIds = (divisions ?? []).map((d: any) => d.id)

    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('id, division_id, user_id, status, seed')
      .eq('tournament_id', id)

    const regCountByDivision: Record<string, number> = {}
    divisionIds.forEach((did: string) => { regCountByDivision[did] = 0 })
    ;(regs ?? []).forEach((r: any) => {
      regCountByDivision[r.division_id] = (regCountByDivision[r.division_id] ?? 0) + 1
    })

    const myReg = (regs ?? []).find((r: any) => r.user_id === session.user.id)

    return NextResponse.json({
      ...tournament,
      sport: (tournament as any).sports
        ? { id: (tournament as any).sports.id, slug: (tournament as any).sports.slug, name: (tournament as any).sports.name, icon: (tournament as any).sports.icon }
        : null,
      sports: undefined,
      divisions: (divisions ?? []).map((d: any) => ({
        ...d,
        registration_count: regCountByDivision[d.id] ?? 0,
      })),
      my_registration: myReg
        ? {
            id: myReg.id,
            division_id: myReg.division_id,
            status: myReg.status,
            seed: myReg.seed,
          }
        : null,
      is_organizer: (tournament as any).organizer_id === session.user.id,
    })
  } catch (err) {
    console.error('Error in GET /api/tournaments/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    const allowed = [
      'name', 'description', 'registration_opens_at', 'registration_closes_at',
      'starts_at', 'ends_at', 'status', 'max_participants', 'location',
    ]
    allowed.forEach((key) => {
      if (body[key] !== undefined) updates[key] = body[key]
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .eq('organizer_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tournament:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PATCH /api/tournaments/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
