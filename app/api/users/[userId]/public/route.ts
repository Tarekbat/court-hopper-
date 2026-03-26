import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isBlockedEitherWay } from '@/lib/moderation'

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
    const viewerId = session.user.id
    if (!viewerIsSelf && (await isBlockedEitherWay(supabase as any, viewerId, userId))) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    type PublicUserRow = {
      id: string
      name: string | null
      image: string | null
      profile_is_public?: boolean | null
      city: string | null
      ntrp_rating?: number | null
      utr_rating?: number | null
      rating_verified?: boolean | null
      rating_source?: string | null
    }

    let userRow: PublicUserRow | null = null

    const withCity = await supabase
      .from('users')
      .select('id, name, image, profile_is_public, city, ntrp_rating, utr_rating, rating_verified, rating_source')
      .eq('id', userId)
      .single()

    if (withCity.error?.code === 'PGRST116' || (!withCity.data && !withCity.error)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (withCity.error?.code === '42703' && String(withCity.error.message).includes('city')) {
      const basic = await supabase
        .from('users')
        .select('id, name, image, profile_is_public, ntrp_rating, utr_rating, rating_verified, rating_source')
        .eq('id', userId)
        .single()
      if (basic.error || !basic.data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      userRow = { ...(basic.data as any), city: null }
    } else if (withCity.error) {
      console.error('public profile users:', withCity.error)
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
    } else {
      userRow = withCity.data as PublicUserRow
    }

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!viewerIsSelf && userRow.profile_is_public === false) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('play_partner_profiles')
      .select(
        `
        id,
        sport_id,
        skill_level,
        ntrp_rating_override,
        utr_rating_override,
        available_now_until,
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
      display_ntrp: p.ntrp_rating_override != null ? Number(p.ntrp_rating_override) : (userRow as any)?.ntrp_rating ?? null,
      display_utr: p.utr_rating_override != null ? Number(p.utr_rating_override) : (userRow as any)?.utr_rating ?? null,
      available_now: p.available_now_until ? String(p.available_now_until) > new Date().toISOString() : false,
    }))

    const availabilityRes = await supabase
      .from('user_availability_slots')
      .select('weekday, day_part')
      .eq('user_id', userId)

    const availability = availabilityRes.error
      ? []
      : (availabilityRes.data ?? []).map((s: any) => ({ weekday: s.weekday, day_part: s.day_part }))

    let connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected' = 'none'
    let connectionId: string | null = null
    let mutualConnections = 0
    let playedTogether = false

    if (!viewerIsSelf) {
      const { data: edge } = await supabase
        .from('player_connections')
        .select('id, requester_id, recipient_id, status')
        .or(
          `and(requester_id.eq.${viewerId},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${viewerId})`
        )
        .maybeSingle()

      if (edge?.status === 'accepted') connectionStatus = 'connected'
      else if (edge?.status === 'pending') {
        connectionStatus = edge.requester_id === viewerId ? 'pending_sent' : 'pending_received'
      }
      if (edge?.id) connectionId = edge.id

      const [viewerEdges, targetEdges, played] = await Promise.all([
        supabase
          .from('player_connections')
          .select('requester_id, recipient_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${viewerId},recipient_id.eq.${viewerId}`),
        supabase
          .from('player_connections')
          .select('requester_id, recipient_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
        supabase
          .from('player_matches')
          .select('id', { head: true, count: 'exact' })
          .or(
            `and(player_a_id.eq.${viewerId},player_b_id.eq.${userId}),and(player_a_id.eq.${userId},player_b_id.eq.${viewerId})`
          )
          .eq('status', 'completed'),
      ])

      const viewerSet = new Set(
        (viewerEdges.data ?? []).map((r: any) =>
          r.requester_id === viewerId ? r.recipient_id : r.requester_id
        )
      )
      const targetSet = new Set(
        (targetEdges.data ?? []).map((r: any) =>
          r.requester_id === userId ? r.recipient_id : r.requester_id
        )
      )
      for (const id of Array.from(viewerSet)) {
        if (targetSet.has(id)) mutualConnections += 1
      }
      playedTogether = (played.count ?? 0) > 0
    }

    return NextResponse.json({
      user: {
        id: userRow.id,
        name: userRow.name,
        image: userRow.image,
        city: userRow.city ?? null,
        ntrp_rating: (userRow as any).ntrp_rating ?? null,
        utr_rating: (userRow as any).utr_rating ?? null,
        rating_verified: (userRow as any).rating_verified === true,
        rating_source: (userRow as any).rating_source ?? null,
      },
      playProfiles,
      availability,
      viewerIsSelf,
      connection_status: connectionStatus,
      connection_id: connectionId,
      mutual_connections: mutualConnections,
      played_together: playedTogether,
    })
  } catch (err) {
    console.error('GET /api/users/[userId]/public:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
