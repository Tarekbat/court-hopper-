import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { searchParams } = new URL(request.url)
    const sportId = searchParams.get('sport_id')

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('play_partner_profiles')
      .select(`
        id,
        user_id,
        sport_id,
        skill_level,
        preferred_locations,
        preferred_days_times,
        notes,
        is_active,
        updated_at,
        sports ( id, slug, name, icon ),
        users ( id, name, image )
      `)
      .eq('is_active', true)
      .neq('user_id', session.user.id)
      .order('updated_at', { ascending: false })

    if (sportId) {
      query = query.eq('sport_id', sportId)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching play partners:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = (profiles ?? []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      sport_id: p.sport_id,
      sport: p.sports ? { id: p.sports.id, slug: p.sports.slug, name: p.sports.name, icon: p.sports.icon } : null,
      skill_level: p.skill_level,
      preferred_locations: p.preferred_locations ?? [],
      preferred_days_times: p.preferred_days_times ?? {},
      notes: p.notes,
      updated_at: p.updated_at,
      name: p.users?.name ?? null,
      image: p.users?.image ?? null,
    }))

    return NextResponse.json(list)
  } catch (err) {
    console.error('Error in GET /api/play-partners:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
