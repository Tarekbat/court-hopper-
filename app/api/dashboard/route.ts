import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next()
    const supabase = createServerSupabaseClient(request, response)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const nowIso = new Date().toISOString()

    // Wave 1: user city, bookings, and my group ids in parallel
    const [userRowResult, bookingsResult, membersResult, createdByMeResult] = await Promise.all([
      supabase.from('users').select('city').eq('id', userId).single(),
      supabase
        .from('bookings')
        .select(
          `
          id,
          court_id,
          court_number,
          booking_date,
          start_time,
          end_time,
          duration,
          price,
          status,
          is_recurring,
          recurring_pattern,
          payment_status,
          court:courts!inner(
            id,
            name,
            address,
            city,
            state,
            zip_code
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('booking_date', nowIso)
        .order('booking_date', { ascending: true })
        .limit(3),
      supabase.from('group_members').select('group_id').eq('user_id', userId),
      supabase.from('groups').select('id').eq('created_by', userId),
    ])

    const userCity = userRowResult.data?.city ?? null
    const bookings = bookingsResult.data ?? []
    const groupIds = (membersResult.data ?? []).map((m: { group_id: string }) => m.group_id)
    const allMyIds = Array.from(
      new Set([
        ...groupIds,
        ...((createdByMeResult.data ?? []).map((g: { id: string }) => g.id)),
      ])
    )

    const nextBookings = bookings.map((b: any) => ({
      id: b.id,
      userId,
      courtId: b.court_id,
      courtNumber: b.court_number,
      bookingDate: b.booking_date ? new Date(b.booking_date).toISOString() : null,
      startTime: b.start_time,
      endTime: b.end_time,
      duration: b.duration,
      price: b.price,
      status: b.status,
      isRecurring: b.is_recurring,
      recurringPattern: b.recurring_pattern,
      paymentStatus: b.payment_status,
      court: b.court
        ? {
            id: b.court.id,
            name: b.court.name,
            address: b.court.address,
            city: b.court.city,
            state: b.court.state,
            zipCode: b.court.zip_code,
          }
        : null,
    }))

    // Wave 2: groups and upcoming events in parallel (only if user has groups)
    let myGroups: any[] = []
    let upcomingEvents: Array<{
      id: string
      group_id: string
      group_name: string
      title: string
      scheduled_at: string
      location: string | null
    }> = []

    if (allMyIds.length > 0) {
      const [groupsResult, eventsResult] = await Promise.all([
        supabase
          .from('groups')
          .select(
            `
            id,
            name,
            description,
            city,
            region,
            is_public,
            created_at,
            sport_id,
            sports ( id, slug, name, icon ),
            created_by,
            group_members ( user_id, role )
          `
          )
          .in('id', allMyIds)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('group_events')
          .select(
            `
            id,
            group_id,
            title,
            scheduled_at,
            location,
            groups ( name )
          `
          )
          .in('group_id', allMyIds)
          .gte('scheduled_at', nowIso)
          .order('scheduled_at', { ascending: true })
          .limit(5),
      ])

      const groups = groupsResult.data ?? []
      myGroups = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        city: g.city,
        region: g.region,
        is_public: g.is_public,
        created_at: g.created_at,
        sport_id: g.sport_id,
        sport: g.sports
          ? {
              id: g.sports.id,
              slug: g.sports.slug,
              name: g.sports.name,
              icon: g.sports.icon,
            }
          : null,
        created_by: g.created_by,
        member_count: Array.isArray(g.group_members) ? g.group_members.length : 0,
        is_member: true,
        is_creator: g.created_by === userId,
      }))

      const events = eventsResult.data ?? []
      upcomingEvents = events.map((e: any) => ({
        id: e.id,
        group_id: e.group_id,
        group_name: e.groups?.name ?? '',
        title: e.title,
        scheduled_at: e.scheduled_at,
        location: e.location ?? null,
      }))
    }

    const jsonResponse = NextResponse.json({
      nextBookings,
      myGroups,
      upcomingEvents,
      userCity,
    })
    response.cookies.getAll().forEach((cookie: { name: string; value: string }) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie as any)
    })
    return jsonResponse
  } catch (err) {
    console.error('Error in GET /api/dashboard:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
