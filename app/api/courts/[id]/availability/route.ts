import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { format, parse, addHours } from 'date-fns'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function getDayNameFromDateStr(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return daysOfWeek[d.getUTCDay()]!
}

function parseHourFromHHMM(time: unknown): number | null {
  if (typeof time !== 'string') return null
  const [hh] = time.split(':')
  const n = parseInt(hh, 10)
  return Number.isFinite(n) ? n : null
}

function getCourtHoursForDay(court: any, _dayName: string) {
  // Default matches existing app behavior.
  let openStartHour = 7
  let closeStartHour = 21

  if (court?.hours_24_7) {
    return { openStartHour, closeStartHour }
  }

  const hoursByDay = court?.hours_by_day ?? court?.hoursByDay
  const dayName = _dayName
  const cfg = hoursByDay && typeof hoursByDay === 'object' ? hoursByDay[dayName] : null
  const open = parseHourFromHHMM(cfg?.open ?? cfg?.start ?? null)
  const close = parseHourFromHHMM(cfg?.close ?? cfg?.end ?? null)

  if (typeof open === 'number' && typeof close === 'number' && Number.isFinite(open) && Number.isFinite(close)) {
    openStartHour = Math.max(0, Math.min(21, open))
    closeStartHour = Math.max(0, Math.min(21, close))
    if (closeStartHour < openStartHour) closeStartHour = openStartHour
  }

  return { openStartHour, closeStartHour }
}

/**
 * Batch availability for a single court across multiple dates.
 * GET /api/courts/[id]/availability?dates=2024-01-01,2024-01-02,...
 * Returns: { [dateStr]: { time, availableCourts }[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courtId } = await params
    const { searchParams } = new URL(request.url)
    const datesParam = searchParams.get('dates')

    if (!datesParam) {
      return NextResponse.json(
        { error: 'dates parameter required (comma-separated ISO dates)' },
        { status: 400 }
      )
    }

    const dates = datesParam.split(',').map((d) => d.trim()).filter(Boolean)
    if (dates.length === 0) {
      return NextResponse.json({}, { status: 200 })
    }

    const adminSupabase = createAdminClient()

    const { data: court, error: courtError } = await adminSupabase
      .from('courts')
      .select('id, total_courts, status, available_days, hours_24_7, hours_by_day')
      .eq('id', courtId)
      .single()

    if (courtError || !court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    const totalCourts = court.total_courts ?? 1
    const minDate = dates.reduce((a, d) => (d < a ? d : a), dates[0])
    const maxDate = dates.reduce((a, d) => (d > a ? d : a), dates[0])

    const { data: bookings, error: bookingsError } = await adminSupabase
      .from('bookings')
      .select('booking_date, start_time, end_time, court_number')
      .eq('court_id', courtId)
      .eq('status', 'confirmed')
      .gte('booking_date', minDate)
      .lte('booking_date', maxDate)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    const bookingsByDate = new Map<string, any[]>()
    for (const b of bookings ?? []) {
      const d = (b.booking_date as string).split('T')[0]
      if (!bookingsByDate.has(d)) bookingsByDate.set(d, [])
      bookingsByDate.get(d)!.push(b)
    }

    const result: Record<string, { time: string; availableCourts: { number: string; isAvailable: boolean }[] }[]> = {}

    for (const dateStr of dates) {
      const dayBookings = bookingsByDate.get(dateStr) ?? []
      const timeSlots: { time: string; availableCourts: { number: string; isAvailable: boolean }[] }[] = []

      const dayName = getDayNameFromDateStr(dateStr)
      const availableDays: unknown = court.available_days ?? []
      const isDayOpen = Array.isArray(availableDays) && availableDays.includes(dayName)
      const isCourtActive = !court.status || court.status === 'active'
      const shouldShowAvailability = isCourtActive && isDayOpen

      const { openStartHour, closeStartHour } = getCourtHoursForDay(court, dayName)

      for (let hour = openStartHour; hour <= closeStartHour; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`
        const endTime = format(addHours(parse(time, 'HH:mm', new Date()), 1), 'HH:mm')

        const bookedCourts = dayBookings
          .filter((b: any) => {
            const bookingStart = parse(b.start_time, 'HH:mm', new Date())
            const bookingEnd = parse(b.end_time, 'HH:mm', new Date())
            const slotStart = parse(time, 'HH:mm', new Date())
            const slotEnd = parse(endTime, 'HH:mm', new Date())
            return (
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
              (slotStart <= bookingStart && slotEnd >= bookingEnd)
            )
          })
          .map((b: any) => b.court_number)

        const availableCourts = Array.from({ length: totalCourts }, (_, i) => {
          const courtNumber = `Court ${i + 1}`
          return {
            number: courtNumber,
            isAvailable: shouldShowAvailability && !bookedCourts.includes(courtNumber),
          }
        })

        timeSlots.push({ time, availableCourts })
      }

      result[dateStr] = timeSlots
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Error in GET /api/courts/[id]/availability:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
