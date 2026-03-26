import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      usersCountRes,
      activeUsersCountRes,
      courtsCountRes,
      activeCourtsCountRes,
      groupsCountRes,
      matchesCompletedCountRes,
      upcomingConfirmedBookingsRes,
    ] = await Promise.all([
      admin.from('users').select('id', { count: 'exact', head: true }),
      admin.from('users').select('id', { count: 'exact', head: true }).gte('updated_at', weekAgoIso),
      admin.from('courts').select('id', { count: 'exact', head: true }),
      admin.from('courts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('groups').select('id', { count: 'exact', head: true }),
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .gte('booking_date', nowIso),
    ])

    const getCount = (r: any) => {
      const v = r?.count
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const n = parseInt(v, 10)
        return Number.isFinite(n) ? n : 0
      }
      return 0
    }

    return NextResponse.json({
      totalUsers: getCount(usersCountRes),
      activeUsers7d: getCount(activeUsersCountRes),
      totalCourts: getCount(courtsCountRes),
      activeCourts: getCount(activeCourtsCountRes),
      totalGroups: getCount(groupsCountRes),
      matchesCompleted: getCount(matchesCompletedCountRes),
      upcomingBookings: getCount(upcomingConfirmedBookingsRes),
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

