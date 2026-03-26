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
    const sportId = searchParams.get('sport_id')
    const ntrpMin = parseNumber(searchParams.get('ntrp_min'))
    const ntrpMax = parseNumber(searchParams.get('ntrp_max'))
    const sort = searchParams.get('sort') || 'recent'

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Viewer context for match scoring (best-effort)
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
        play_styles,
        surface_preferences,
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

    if (sportId) {
      query = query.eq('sport_id', sportId)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching play partners:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (profiles ?? []).filter((p: any) => p.users?.profile_is_public !== false && !blockedIds.has(p.user_id))

    // Batch-load candidate availability slots (best-effort; if table/migration isn't present yet, ignore)
    const userIds = Array.from(new Set(rows.map((p: any) => p.user_id).filter(Boolean)))
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

    const decorated = rows.map((p: any) => {
      const globalNtrp = p.users?.ntrp_rating != null ? Number(p.users.ntrp_rating) : null
      const globalUtr = p.users?.utr_rating != null ? Number(p.users.utr_rating) : null
      const displayNtrp = p.ntrp_rating_override != null ? Number(p.ntrp_rating_override) : globalNtrp
      const displayUtr = p.utr_rating_override != null ? Number(p.utr_rating_override) : globalUtr

      const availableNow = p.available_now_until ? String(p.available_now_until) > nowIso : false

      // Availability overlap score (0..30)
      const candidateSlots = slotsByUserId.get(p.user_id) ?? new Set<string>()
      let overlap = 0
      if (viewerSlotsSet.size > 0 && candidateSlots.size > 0) {
        for (const k of Array.from(candidateSlots)) if (viewerSlotsSet.has(k)) overlap += 1
      }
      const availabilityScore = viewerSlotsSet.size > 0 ? clamp(Math.round((overlap / Math.max(1, viewerSlotsSet.size)) * 30), 0, 30) : 0

      // Rating proximity score (0..60) using NTRP when available
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
        sport: p.sports ? { id: p.sports.id, slug: p.sports.slug, name: p.sports.name, icon: p.sports.icon } : null,
        skill_level: p.skill_level,
        preferred_locations: p.preferred_locations ?? [],
        preferred_days_times: p.preferred_days_times ?? {},
        notes: p.notes,
        updated_at: p.updated_at,
        name: p.users?.name ?? null,
        image: p.users?.image ?? null,

        // New fields (optional for old UI)
        display_ntrp: displayNtrp,
        display_utr: displayUtr,
        available_now: availableNow,
        match_score_pct: matchScorePct,
        last_active_at: p.users?.last_active_at ?? null,
        city: p.users?.city ?? null,
      }
    })

    const ratingFiltered = decorated.filter((p) => {
      if (ntrpMin != null && (p.display_ntrp == null || p.display_ntrp < ntrpMin)) return false
      if (ntrpMax != null && (p.display_ntrp == null || p.display_ntrp > ntrpMax)) return false
      return true
    })

    const sorted = [...ratingFiltered].sort((a, b) => {
      if (sort === 'match') return (b.match_score_pct ?? 0) - (a.match_score_pct ?? 0)
      if (sort === 'rating') return (b.display_ntrp ?? -1) - (a.display_ntrp ?? -1)
      if (sort === 'recent') return String(b.updated_at).localeCompare(String(a.updated_at))
      return String(b.updated_at).localeCompare(String(a.updated_at))
    })

    const existingUserIds = new Set(sorted.map((p: any) => p.user_id))
    const { data: publicUsers } = await supabase
      .from('users')
      .select('id, name, image, city, ntrp_rating, utr_rating, last_active_at, profile_is_public')
      .neq('id', session.user.id)
      .eq('profile_is_public', true)
      .limit(100)

    const fallbackUsers = (publicUsers ?? [])
      .filter((u: any) => !existingUserIds.has(u.id) && !blockedIds.has(u.id))
      .map((u: any) => ({
        id: `user-${u.id}`,
        user_id: u.id,
        sport_id: null,
        sport: null,
        skill_level: null,
        preferred_locations: [],
        preferred_days_times: {},
        notes: null,
        updated_at: u.last_active_at ?? new Date(0).toISOString(),
        name: u.name ?? null,
        image: u.image ?? null,
        display_ntrp: u.ntrp_rating != null ? Number(u.ntrp_rating) : null,
        display_utr: u.utr_rating != null ? Number(u.utr_rating) : null,
        available_now: false,
        match_score_pct: null,
        last_active_at: u.last_active_at ?? null,
        city: u.city ?? null,
      }))
      .filter((p) => {
        if (ntrpMin != null && (p.display_ntrp == null || p.display_ntrp < ntrpMin)) return false
        if (ntrpMax != null && (p.display_ntrp == null || p.display_ntrp > ntrpMax)) return false
        return true
      })

    const merged = [...sorted, ...fallbackUsers]
    return NextResponse.json(merged)
  } catch (err) {
    console.error('Error in GET /api/play-partners:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
