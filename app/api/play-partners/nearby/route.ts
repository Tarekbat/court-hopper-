import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBlockedUserIds } from '@/lib/moderation'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function parseNumber(value: string | null) {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')?.trim()
    const sportId = searchParams.get('sport_id')
    const ntrpMin = parseNumber(searchParams.get('ntrp_min'))
    const ntrpMax = parseNumber(searchParams.get('ntrp_max'))
    const sort = searchParams.get('sort') || 'recent'

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!city) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }

    const viewerUser = await supabase
      .from('users')
      .select('id, ntrp_rating, utr_rating')
      .eq('id', session.user.id)
      .single()

    const viewerNtrp = (viewerUser.data as any)?.ntrp_rating != null ? Number((viewerUser.data as any).ntrp_rating) : null

    const viewerSlotsRes = await supabase
      .from('user_availability_slots')
      .select('weekday, day_part')
      .eq('user_id', session.user.id)
    const viewerSlots = (viewerSlotsRes.data ?? []).map((s: any) => `${s.weekday}:${s.day_part}`)
    const viewerSlotsSet = new Set(viewerSlots)
    const blockedIds = await getBlockedUserIds(supabase as any, session.user.id)

    let query = supabase
      .from('play_partner_profiles')
      .select(`
        id,
        user_id,
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
        sports ( id, slug, name, icon ),
        users ( id, name, image, profile_is_public, city, ntrp_rating, utr_rating, last_active_at )
      `)
      .eq('is_active', true)
      .neq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (sportId) {
      query = query.eq('sport_id', sportId)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching nearby play partners:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const normalizeCity = (value: unknown) => {
      if (value == null) return ''
      return String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        // remove common separators so "Orlando, FL" matches "Orlando FL"
        .replace(/[.,]/g, '')
    }

    const cityNorm = normalizeCity(city)

    const filtered = (profiles ?? []).filter((p: any) => {
      if (blockedIds.has(p.user_id)) return false
      if (p.users?.profile_is_public === false) return false
      const preferredLocations = Array.isArray(p.preferred_locations)
        ? p.preferred_locations
        : []

      const inPreferred = preferredLocations.some((loc: unknown) => {
        const locNorm = normalizeCity(loc)
        if (!locNorm || !cityNorm) return false
        return locNorm === cityNorm || locNorm.includes(cityNorm) || cityNorm.includes(locNorm)
      })

      const userCityNorm = normalizeCity(p.users?.city)
      const inUserCity = Boolean(
        userCityNorm && cityNorm && (userCityNorm === cityNorm || userCityNorm.includes(cityNorm) || cityNorm.includes(userCityNorm))
      )

      return inPreferred || inUserCity
    })

    const userIds = Array.from(new Set(filtered.map((p: any) => p.user_id).filter(Boolean)))
    let connectionStatusByUser = new Map<string, 'none' | 'pending_sent' | 'pending_received' | 'connected'>()
    let mutualCountByUser = new Map<string, number>()
    let playedTogetherByUser = new Map<string, boolean>()

    if (userIds.length > 0) {
      const { data: directEdges } = await supabase
        .from('player_connections')
        .select('requester_id, recipient_id, status')
        .eq('requester_id', session.user.id)
        .in('recipient_id', userIds)
      const { data: reverseEdges } = await supabase
        .from('player_connections')
        .select('requester_id, recipient_id, status')
        .eq('recipient_id', session.user.id)
        .in('requester_id', userIds)

      for (const e of directEdges ?? []) {
        const status =
          e.status === 'accepted' ? 'connected' : ('pending_sent' as const)
        connectionStatusByUser.set(e.recipient_id, status)
      }
      for (const e of reverseEdges ?? []) {
        if ((connectionStatusByUser.get(e.requester_id) ?? 'none') === 'connected') continue
        const status =
          e.status === 'accepted' ? 'connected' : ('pending_received' as const)
        connectionStatusByUser.set(e.requester_id, status)
      }

      const { data: viewerAccepted } = await supabase
        .from('player_connections')
        .select('requester_id, recipient_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
      const viewerConnections = new Set(
        (viewerAccepted ?? []).map((r: any) =>
          r.requester_id === session.user.id ? r.recipient_id : r.requester_id
        )
      )

      const { data: playedRows } = await supabase
        .from('player_matches')
        .select('player_a_id, player_b_id, status')
        .eq('status', 'completed')
        .or(
          userIds
            .map(
              (uid) =>
                `and(player_a_id.eq.${session.user.id},player_b_id.eq.${uid}),and(player_a_id.eq.${uid},player_b_id.eq.${session.user.id})`
            )
            .join(',')
        )
      for (const r of playedRows ?? []) {
        const other = r.player_a_id === session.user.id ? r.player_b_id : r.player_a_id
        playedTogetherByUser.set(other, true)
      }

      for (const uid of userIds) {
        const { data: edges } = await supabase
          .from('player_connections')
          .select('requester_id, recipient_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${uid},recipient_id.eq.${uid}`)
        const peers = new Set(
          (edges ?? []).map((r: any) => (r.requester_id === uid ? r.recipient_id : r.requester_id))
        )
        let count = 0
        for (const v of Array.from(viewerConnections)) if (peers.has(v)) count += 1
        mutualCountByUser.set(uid, count)
      }
    }
    let slotsByUserId = new Map<string, Set<string>>()
    if (userIds.length > 0) {
      const slotsRes = await supabase
        .from('user_availability_slots')
        .select('user_id, weekday, day_part')
        .in('user_id', userIds)

      if (!slotsRes.error) {
        for (const s of slotsRes.data ?? []) {
          const uid = (s as any).user_id as string
          const key = `${(s as any).weekday}:${(s as any).day_part}`
          const set = slotsByUserId.get(uid) ?? new Set<string>()
          set.add(key)
          slotsByUserId.set(uid, set)
        }
      }
    }

    const nowIso = new Date().toISOString()

    const decorated = filtered.map((p: any) => {
      const globalNtrp = p.users?.ntrp_rating != null ? Number(p.users.ntrp_rating) : null
      const globalUtr = p.users?.utr_rating != null ? Number(p.users.utr_rating) : null
      const displayNtrp = p.ntrp_rating_override != null ? Number(p.ntrp_rating_override) : globalNtrp
      const displayUtr = p.utr_rating_override != null ? Number(p.utr_rating_override) : globalUtr
      const availableNow = p.available_now_until ? String(p.available_now_until) > nowIso : false

      const candidateSlots = slotsByUserId.get(p.user_id) ?? new Set<string>()
      let overlap = 0
      if (viewerSlotsSet.size > 0 && candidateSlots.size > 0) {
        for (const k of Array.from(candidateSlots)) if (viewerSlotsSet.has(k)) overlap += 1
      }
      const availabilityScore = viewerSlotsSet.size > 0 ? clamp(Math.round((overlap / Math.max(1, viewerSlotsSet.size)) * 30), 0, 30) : 0

      let ratingScore = 0
      if (viewerNtrp != null && displayNtrp != null) {
        const diff = Math.abs(viewerNtrp - displayNtrp)
        ratingScore = clamp(Math.round((1 - Math.min(diff, 2) / 2) * 60), 0, 60)
      }

      const matchScorePct = clamp(10 + availabilityScore + ratingScore, 0, 100)

      return {
        id: p.id,
        user_id: p.user_id,
        sport_id: p.sport_id,
        sport: p.sports
          ? { id: p.sports.id, slug: p.sports.slug, name: p.sports.name, icon: p.sports.icon }
          : null,
        skill_level: p.skill_level,
        preferred_locations: p.preferred_locations ?? [],
        preferred_days_times: p.preferred_days_times ?? {},
        notes: p.notes,
        updated_at: p.updated_at,
        name: p.users?.name ?? null,
        image: p.users?.image ?? null,
        city: p.users?.city ?? null,

        display_ntrp: displayNtrp,
        display_utr: displayUtr,
        available_now: availableNow,
        match_score_pct: matchScorePct,
        last_active_at: p.users?.last_active_at ?? null,
        connection_status: connectionStatusByUser.get(p.user_id) ?? 'none',
        mutual_connections: mutualCountByUser.get(p.user_id) ?? 0,
        played_together: playedTogetherByUser.get(p.user_id) === true,
      }
    })

    const ratingFiltered = decorated.filter((p) => {
      if (ntrpMin != null && (p.display_ntrp == null || p.display_ntrp < ntrpMin)) return false
      if (ntrpMax != null && (p.display_ntrp == null || p.display_ntrp > ntrpMax)) return false
      return true
    })

    const connectionRank = (s: string) =>
      s === 'connected' ? 3 : s === 'pending_received' ? 2 : s === 'pending_sent' ? 1 : 0

    const sorted = [...ratingFiltered].sort((a, b) => {
      const c = connectionRank(b.connection_status) - connectionRank(a.connection_status)
      if (c !== 0) return c
      if (sort === 'match') return (b.match_score_pct ?? 0) - (a.match_score_pct ?? 0)
      if (sort === 'rating') return (b.display_ntrp ?? -1) - (a.display_ntrp ?? -1)
      if (sort === 'recent') return String(b.updated_at).localeCompare(String(a.updated_at))
      return String(b.updated_at).localeCompare(String(a.updated_at))
    })

    return NextResponse.json(sorted)
  } catch (err) {
    console.error('Error in GET /api/play-partners/nearby:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
