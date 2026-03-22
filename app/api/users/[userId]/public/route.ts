import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Public player profile for discovery (no email/phone).
 * Requires authentication. RLS allows reading other users' display fields and active play profiles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId?.trim()
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const viewerIsSelf = session.user.id === userId

    type PublicUserRow = {
      id: string
      name: string | null
      image: string | null
      city: string | null
    }

    let userRow: PublicUserRow | null = null

    const withCity = await supabase
      .from('users')
      .select('id, name, image, city')
      .eq('id', userId)
      .single()

    if (withCity.error?.code === 'PGRST116' || (!withCity.data && !withCity.error)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (withCity.error?.code === '42703' && String(withCity.error.message).includes('city')) {
      const basic = await supabase
        .from('users')
        .select('id, name, image')
        .eq('id', userId)
        .single()
      if (basic.error || !basic.data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      userRow = { ...basic.data, city: null }
    } else if (withCity.error) {
      console.error('public profile users:', withCity.error)
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
    } else {
      userRow = withCity.data as PublicUserRow
    }

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('play_partner_profiles')
      .select(
        `
        id,
        sport_id,
        skill_level,
        preferred_locations,
        preferred_days_times,
        notes,
        is_active,
        updated_at,
        sports ( id, slug, name, icon )
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (profilesError) {
      console.error('public profile play_partner_profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to load play profiles' }, { status: 500 })
    }

    const playProfiles = (profiles ?? []).map((p: any) => ({
      id: p.id,
      sport_id: p.sport_id,
      sport: p.sports
        ? { id: p.sports.id, slug: p.sports.slug, name: p.sports.name, icon: p.sports.icon }
        : null,
      skill_level: p.skill_level,
      preferred_locations: p.preferred_locations ?? [],
      preferred_days_times: p.preferred_days_times ?? {},
      notes: p.notes,
      updated_at: p.updated_at,
    }))

    return NextResponse.json({
      user: {
        id: userRow.id,
        name: userRow.name,
        image: userRow.image,
        city: userRow.city ?? null,
      },
      playProfiles,
      viewerIsSelf,
    })
  } catch (err) {
    console.error('GET /api/users/[userId]/public:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
