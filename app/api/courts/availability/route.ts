import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { parse, format, addHours } from 'date-fns'

export const dynamic = 'force-dynamic'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function getDayNameFromDateStr(dateStr: string) {
  // Ensure stable UTC day-of-week.
  const d = new Date(`${dateStr}T00:00:00Z`)
  return daysOfWeek[d.getUTCDay()]!
}

function parseHourFromHHMM(time: unknown): number | null {
  if (typeof time !== 'string') return null
  const [hh] = time.split(':')
  const n = parseInt(hh, 10)
  return Number.isFinite(n) ? n : null
}

function getCourtHoursForDay(court: any, dayName: string) {
  // Default matches existing app behavior.
  let openStartHour = 7
  let closeStartHour = 21

  if (court?.hours_24_7) {
    return { openStartHour, closeStartHour }
  }

  const hoursByDay = court?.hours_by_day ?? court?.hoursByDay
  const cfg = hoursByDay && typeof hoursByDay === 'object' ? hoursByDay[dayName] : null
  const open = parseHourFromHHMM(cfg?.open ?? cfg?.start ?? null)
  const close = parseHourFromHHMM(cfg?.close ?? cfg?.end ?? null)

  // Clamp to avoid cross-midnight booking issues (the app assumes bookings are within a single-day window).
  if (typeof open === 'number' && typeof close === 'number' && Number.isFinite(open) && Number.isFinite(close)) {
    openStartHour = Math.max(0, Math.min(21, open))
    closeStartHour = Math.max(0, Math.min(21, close))
    if (closeStartHour < openStartHour) closeStartHour = openStartHour
  }

  return { openStartHour, closeStartHour }
}

/**
 * Batch availability endpoint - fetches availability for multiple courts and dates in one query
 * Accepts: ?courtIds=id1,id2,id3&dates=2024-01-01,2024-01-02,2024-01-03
 * Returns: { [courtId]: { [date]: number } } where number is max available courts at any hour that day.
 * Optional: ?includeSlotCounts=1 adds hourly "open slot" count (hours 7–21 with ≥1 free court), same shape in slotCounts.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courtIdsParam = searchParams.get('courtIds')
    const datesParam = searchParams.get('dates')
    const includeSlotCounts =
      searchParams.get('includeSlotCounts') === '1' || searchParams.get('includeSlotCounts') === 'true'

    if (!courtIdsParam || !datesParam) {
      return NextResponse.json(
        { error: 'courtIds and dates parameters are required' },
        { status: 400 }
      )
    }

    const courtIds = courtIdsParam.split(',').filter(Boolean)
    const dates = datesParam.split(',').filter(Boolean)

    if (courtIds.length === 0 || dates.length === 0) {
      return NextResponse.json({}, { status: 200 })
    }

    // Get all courts with their total_courts in one query
    const adminSupabase = createAdminClient()
    const { data: courts, error: courtsError } = await adminSupabase
      .from('courts')
      .select('id, total_courts, status, available_days, hours_24_7, hours_by_day')
      .in('id', courtIds)

    if (courtsError || !courts) {
      return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 })
    }

    const courtMap = new Map(courts.map((c: any) => [c.id, c]))

    // Build date ranges
    const dateRanges = dates.map((dateStr: string) => {
      const requestedDate = new Date(dateStr)
      return {
        dateStr,
        startOfDay: new Date(Date.UTC(
          requestedDate.getUTCFullYear(),
          requestedDate.getUTCMonth(),
          requestedDate.getUTCDate(),
          0, 0, 0, 0
        )),
        endOfDay: new Date(Date.UTC(
          requestedDate.getUTCFullYear(),
          requestedDate.getUTCMonth(),
          requestedDate.getUTCDate(),
          23, 59, 59, 999
        ))
      }
    })

    // Single database query for all bookings across all courts and dates
    // Optimized with proper ordering to leverage indexes
    const minDate = new Date(Math.min(...dateRanges.map((dr: { startOfDay: Date; endOfDay: Date; dateStr: string }) => dr.startOfDay.getTime())))
    const maxDate = new Date(Math.max(...dateRanges.map((dr: { startOfDay: Date; endOfDay: Date; dateStr: string }) => dr.endOfDay.getTime())))

    const { data: allBookings, error: bookingsError } = await adminSupabase
      .from('bookings')
      .select('court_id, booking_date, start_time, end_time, court_number')
      .in('court_id', courtIds)
      .eq('status', 'confirmed')
      .gte('booking_date', minDate.toISOString())
      .lte('booking_date', maxDate.toISOString())
      .order('court_id', { ascending: true })
      .order('booking_date', { ascending: true })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Initialize result structure
    const availabilityMap: Record<string, Record<string, number>> = {}
    const slotCountsMap: Record<string, Record<string, number>> = {}
    courtIds.forEach((courtId: string) => {
      availabilityMap[courtId] = {}
      if (includeSlotCounts) slotCountsMap[courtId] = {}
      dates.forEach((dateStr: string) => {
        availabilityMap[courtId][dateStr] = 0
        if (includeSlotCounts) slotCountsMap[courtId][dateStr] = 0
      })
    })

    // Group bookings by court and date
    const bookingsByCourtAndDate = new Map<string, any[]>()
    
    ;(allBookings || []).forEach((booking: { court_id: string; booking_date: string; start_time: string; end_time: string; court_number: string }) => {
      const bookingDate = new Date(booking.booking_date).toISOString().split('T')[0]
      const key = `${booking.court_id}:${bookingDate}`
      
      if (!bookingsByCourtAndDate.has(key)) {
        bookingsByCourtAndDate.set(key, [])
      }
      bookingsByCourtAndDate.get(key)!.push(booking)
    })

    // Calculate max available courts for each court/date
    courtIds.forEach((courtId: string) => {
      const court = courtMap.get(courtId)
      const totalCourts = court?.total_courts || 1
      
      dates.forEach((dateStr: string) => {
        const key = `${courtId}:${dateStr}`
        const dayBookings = bookingsByCourtAndDate.get(key) || []

        const dayName = getDayNameFromDateStr(dateStr)

        // Inactive / closed courts never have availability.
        if (court?.status && court.status !== 'active') {
          availabilityMap[courtId][dateStr] = 0
          if (includeSlotCounts) slotCountsMap[courtId][dateStr] = 0
          return
        }

        // Respect admin-configured open days.
        const availableDays: unknown = court?.available_days ?? []
        const isDayOpen = Array.isArray(availableDays) && availableDays.includes(dayName)
        if (!isDayOpen) {
          availabilityMap[courtId][dateStr] = 0
          if (includeSlotCounts) slotCountsMap[courtId][dateStr] = 0
          return
        }

        const { openStartHour, closeStartHour } = getCourtHoursForDay(court, dayName)

        // max courts free in any operating hour, and how many hours have ≥1 court free
        let maxAvailable = 0
        let hoursWithAvailability = 0

        for (let hour = openStartHour; hour <= closeStartHour; hour++) {
          const time = `${hour.toString().padStart(2, '0')}:00`
          const endTime = format(addHours(parse(time, 'HH:mm', new Date()), 1), 'HH:mm')

          const bookedCourtNumbers = new Set<string>()

          dayBookings.forEach((booking: any) => {
            const bookingStart = parse(booking.start_time, 'HH:mm', new Date())
            const bookingEnd = parse(booking.end_time, 'HH:mm', new Date())
            const slotStart = parse(time, 'HH:mm', new Date())
            const slotEnd = parse(endTime, 'HH:mm', new Date())

            const overlaps =
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
              (slotStart <= bookingStart && slotEnd >= bookingEnd)

            if (overlaps) {
              bookedCourtNumbers.add(booking.court_number)
            }
          })

          const availableCount = totalCourts - bookedCourtNumbers.size
          if (availableCount > 0) hoursWithAvailability++
          if (availableCount > maxAvailable) {
            maxAvailable = availableCount
          }
        }

        availabilityMap[courtId][dateStr] = maxAvailable
        if (includeSlotCounts) {
          slotCountsMap[courtId][dateStr] = hoursWithAvailability
        }
      })
    })

    if (includeSlotCounts) {
      return NextResponse.json({
        maxAvailability: availabilityMap,
        slotCounts: slotCountsMap,
      })
    }

    return NextResponse.json(availabilityMap)
  } catch (error) {
    console.error('Error in batch availability endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

