import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createTournamentSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  sport_id: z.string().uuid(),
  registration_opens_at: z.string().datetime().optional(),
  registration_closes_at: z.string().datetime().optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  bracket_type: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_knockout']).optional().default('single_elimination'),
  team_size: z.number().int().min(1).max(2).optional().default(1),
  groups_count: z.number().int().min(2).max(8).optional(),
  max_participants: z.number().int().positive().optional(),
  location: z.string().max(200).optional(),
  divisions: z.array(z.object({
    name: z.string().min(1).max(100),
    skill_level_min: z.number().int().min(1).max(5).optional(),
    skill_level_max: z.number().int().min(1).max(5).optional(),
    max_participants: z.number().int().positive().optional(),
  })).min(1),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { searchParams } = new URL(request.url)
    const sportId = searchParams.get('sport_id')
    const status = searchParams.get('status')

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
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
        max_participants,
        location,
        created_at,
        sports ( id, slug, name, icon )
      `)
      .order('starts_at', { ascending: true })

    if (sportId) query = query.eq('sport_id', sportId)
    if (status) query = query.eq('status', status)

    const { data: tournaments, error } = await query

    if (error) {
      console.error('Error fetching tournaments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = (tournaments ?? []).map((t: any) => ({
      ...t,
      sport: t.sports ? { id: t.sports.id, slug: t.sports.slug, name: t.sports.name, icon: t.sports.icon } : null,
      sports: undefined,
    }))

    return NextResponse.json(list)
  } catch (err) {
    console.error('Error in GET /api/tournaments:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createTournamentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const {
      name,
      description,
      sport_id,
      registration_opens_at,
      registration_closes_at,
      starts_at,
      ends_at,
      bracket_type,
      team_size,
      groups_count,
      max_participants,
      location,
      divisions,
    } = parsed.data

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name,
        description: description ?? null,
        sport_id,
        organizer_id: session.user.id,
        registration_opens_at: registration_opens_at ?? null,
        registration_closes_at: registration_closes_at ?? null,
        starts_at,
        ends_at: ends_at ?? null,
        status: 'draft',
        bracket_type,
        team_size: team_size ?? 1,
        groups_count: bracket_type === 'group_knockout' ? (groups_count ?? 2) : null,
        max_participants: max_participants ?? null,
        location: location ?? null,
      })
      .select('id, name, description, sport_id, organizer_id, starts_at, status, created_at')
      .single()

    if (tournamentError || !tournament) {
      console.error('Error creating tournament:', tournamentError)
      return NextResponse.json({ error: tournamentError?.message ?? 'Failed to create tournament' }, { status: 500 })
    }

    for (const div of divisions) {
      const { error: divError } = await supabase.from('tournament_divisions').insert({
        tournament_id: tournament.id,
        name: div.name,
        skill_level_min: div.skill_level_min ?? null,
        skill_level_max: div.skill_level_max ?? null,
        max_participants: div.max_participants ?? null,
      })
      if (divError) {
        console.error('Error creating division:', divError)
        await supabase.from('tournaments').delete().eq('id', tournament.id)
        return NextResponse.json({ error: 'Failed to create divisions' }, { status: 500 })
      }
    }

    return NextResponse.json(tournament)
  } catch (err) {
    console.error('Error in POST /api/tournaments:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
