import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profiles, error } = await supabase
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
        sports ( id, slug, name, icon )
      `)
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching play profiles:', error)
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
      is_active: p.is_active,
      updated_at: p.updated_at,
    }))

    return NextResponse.json(list)
  } catch (err) {
    console.error('Error in GET /api/play-partners/me:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sport_id, skill_level, preferred_locations, preferred_days_times, notes, is_active } = body

    if (!sport_id) {
      return NextResponse.json({ error: 'sport_id is required' }, { status: 400 })
    }

    const payload = {
      user_id: session.user.id,
      sport_id,
      skill_level: skill_level != null ? Number(skill_level) : null,
      preferred_locations: Array.isArray(preferred_locations) ? preferred_locations : [],
      preferred_days_times: preferred_days_times && typeof preferred_days_times === 'object' ? preferred_days_times : {},
      notes: notes != null ? String(notes) : null,
      is_active: is_active !== false,
    }

    const { data, error } = await supabase
      .from('play_partner_profiles')
      .upsert(payload, {
        onConflict: 'user_id,sport_id',
        ignoreDuplicates: false,
      })
      .select('id, user_id, sport_id, skill_level, preferred_locations, preferred_days_times, notes, is_active, updated_at')
      .single()

    if (error) {
      console.error('Error upserting play profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PUT /api/play-partners/me:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
