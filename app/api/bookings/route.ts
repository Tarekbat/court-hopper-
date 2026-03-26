import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { addHours, parse, format } from 'date-fns'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/api-auth'

const createBookingSchema = z.object({
  courtId: z.string(),
  courtNumber: z.string(),
  bookingDate: z.string(), // ISO date string
  startTime: z.string(),
  duration: z.number().min(0.5).max(4),
  isRecurring: z.boolean().optional(),
  recurringPattern: z
    .object({
      frequency: z.enum(['weekly', 'biweekly', 'monthly']),
      endDate: z.string().optional(),
      daysOfWeek: z.array(z.string()).optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, { requireVerifiedEmail: true })
    if (auth instanceof NextResponse) return auth
    const { supabase, session } = auth
    const user = session.user
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'confirmed'
    const upcoming = searchParams.get('upcoming') === 'true'
    const limitParam = searchParams.get('limit')
    const cursor = searchParams.get('cursor') // ISO date string for pagination
    const limit = Math.min(Math.max(Number(limitParam || 50), 1), 100)

    // Optimize: Only select needed fields from bookings and courts
    // This reduces data transfer and improves query performance
    let query = supabase
      .from('bookings')
      .select(`
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
      `)
      .eq('user_id', user.id)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Cursor pagination:
    // - upcoming=true: cursor is last booking_date from previous page, fetch > cursor in ascending
    // - upcoming=false: cursor is last booking_date from previous page, fetch < cursor in descending
    if (upcoming) {
      query = query.gte('booking_date', new Date().toISOString())
        .order('booking_date', { ascending: true })
      if (cursor) query = query.gt('booking_date', cursor)
    } else {
      query = query.order('booking_date', { ascending: false })
      if (cursor) query = query.lt('booking_date', cursor)
    }

    const { data: bookings, error } = await query.limit(limit)

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform bookings to match expected format
    // Only include fields that are actually used by the frontend
    const transformedBookings = (bookings || []).map((booking: any) => ({
      id: booking.id,
      userId: user.id,
      courtId: booking.court_id,
      courtNumber: booking.court_number,
      bookingDate: booking.booking_date ? new Date(booking.booking_date).toISOString() : null,
      startTime: booking.start_time,
      endTime: booking.end_time,
      duration: booking.duration,
      price: booking.price,
      status: booking.status,
      isRecurring: booking.is_recurring,
      recurringPattern: booking.recurring_pattern,
      paymentStatus: booking.payment_status,
      court: booking.court ? {
        id: booking.court.id,
        name: booking.court.name,
        address: booking.court.address,
        city: booking.court.city,
        state: booking.court.state,
        zipCode: booking.court.zip_code,
      } : null,
    }))

    const nextCursor =
      transformedBookings.length > 0
        ? transformedBookings[transformedBookings.length - 1]!.bookingDate
        : null

    return NextResponse.json({
      items: transformedBookings,
      nextCursor,
      limit,
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const body = await request.json()
    const validatedData = createBookingSchema.parse(body)

    // Check if court exists
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('*')
      .eq('id', validatedData.courtId)
      .single()

    if (courtError || !court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    // Production-grade server-side availability validation:
    // - court must be active
    // - booking date must be an open day (if configured)
    // - booking time must fit within operating hours (if configured)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const parseHourFromHHMM = (time: string) => {
      const [hh] = time.split(':')
      const n = parseInt(hh, 10)
      return Number.isFinite(n) ? n : null
    }

    const bookingDateObjForHours = new Date(validatedData.bookingDate)
    const normalizedBookingDateForHours = new Date(
      Date.UTC(
        bookingDateObjForHours.getUTCFullYear(),
        bookingDateObjForHours.getUTCMonth(),
        bookingDateObjForHours.getUTCDate(),
        0,
        0,
        0,
        0
      )
    )
    const bookingDayName = dayNames[normalizedBookingDateForHours.getUTCDay()]!

    if (court.status && court.status !== 'active') {
      return NextResponse.json({ error: 'Court is not available' }, { status: 409 })
    }

    const configuredAvailableDays: unknown = court.available_days ?? []
    const openDays = Array.isArray(configuredAvailableDays) ? configuredAvailableDays : []
    // If the admin didn't configure open days (empty array), treat it as open all days.
    if (openDays.length > 0 && !openDays.includes(bookingDayName)) {
      return NextResponse.json({ error: 'Court is not available on this day' }, { status: 409 })
    }

    const getCourtHoursForDay = (courtRow: any, dayName: string) => {
      let openStartHour = 7
      let closeStartHour = 21

      if (courtRow?.hours_24_7) return { openStartHour, closeStartHour }

      const hoursByDay = courtRow?.hours_by_day ?? courtRow?.hoursByDay
      const cfg = hoursByDay && typeof hoursByDay === 'object' ? hoursByDay[dayName] : null
      const open = parseHourFromHHMM(cfg?.open ?? cfg?.start ?? '07:00')
      const close = parseHourFromHHMM(cfg?.close ?? cfg?.end ?? '21:00')

      if (typeof open === 'number' && typeof close === 'number') {
        openStartHour = Math.max(0, Math.min(21, open))
        closeStartHour = Math.max(0, Math.min(21, close))
        if (closeStartHour < openStartHour) closeStartHour = openStartHour
      }

      return { openStartHour, closeStartHour }
    }

    const startHour = parseHourFromHHMM(validatedData.startTime)
    if (startHour === null) {
      return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 })
    }

    const { openStartHour, closeStartHour } = getCourtHoursForDay(court, bookingDayName)

    if (startHour < openStartHour || startHour > closeStartHour) {
      return NextResponse.json({ error: 'Court is not available at this time' }, { status: 409 })
    }

    // In this system, `close` is the last available 1-hour start time (existing 7-21 semantics).
    // A booking ending right after `close` is allowed, but bookings that extend past `close + 1` are not.
    if (startHour + validatedData.duration > closeStartHour + 1) {
      return NextResponse.json({ error: 'Court operating hours do not support this duration' }, { status: 409 })
    }

    // Check availability
    const bookingDate = new Date(validatedData.bookingDate)
    const startTime = validatedData.startTime
    const endTime = format(
      addHours(parse(startTime, 'HH:mm', new Date()), validatedData.duration),
      'HH:mm'
    )

    // Check for conflicts - need to check overlapping time slots
    // Normalize to UTC to avoid timezone issues
    const startOfDay = new Date(Date.UTC(
      bookingDate.getUTCFullYear(),
      bookingDate.getUTCMonth(),
      bookingDate.getUTCDate(),
      0, 0, 0, 0
    ))
    const endOfDay = new Date(Date.UTC(
      bookingDate.getUTCFullYear(),
      bookingDate.getUTCMonth(),
      bookingDate.getUTCDate(),
      23, 59, 59, 999
    ))

    // Use admin client to see ALL bookings for conflict checking (not just user's own)
    const adminSupabase = createAdminClient()
    const { data: existingBookings } = await adminSupabase
      .from('bookings')
      .select('*')
      .eq('court_id', validatedData.courtId)
      .eq('court_number', validatedData.courtNumber)
      .eq('status', 'confirmed')
      .gte('booking_date', startOfDay.toISOString())
      .lte('booking_date', endOfDay.toISOString())

    // Check for time conflicts
    const conflictingBooking = (existingBookings || []).find((b) => {
      const bookingStart = parse(b.start_time, 'HH:mm', new Date())
      const bookingEnd = parse(b.end_time, 'HH:mm', new Date())
      const slotStart = parse(startTime, 'HH:mm', new Date())
      const slotEnd = parse(endTime, 'HH:mm', new Date())

      return (
        (slotStart >= bookingStart && slotStart < bookingEnd) ||
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
        (slotStart <= bookingStart && slotEnd >= bookingEnd)
      )
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      )
    }

    // Calculate price based on court cost model
    const costType = (court.cost_type as string | undefined) ?? 'pay_per_hour'
    const hour = parseInt(startTime.split(':')[0])
    const isPeakTime = (hour >= 17 && hour < 20) || hour === 12
    const pricePerHour =
      costType === 'free' || costType === 'membership_required'
        ? 0
        : isPeakTime
          ? court.peak_price
          : court.off_peak_price
    const totalPrice = pricePerHour * validatedData.duration

    // Generate unique ID for booking
    const bookingId = randomUUID()

    // Normalize booking date to midnight UTC to ensure consistent date comparison
    const bookingDateObj = new Date(validatedData.bookingDate)
    const normalizedBookingDate = new Date(Date.UTC(
      bookingDateObj.getUTCFullYear(),
      bookingDateObj.getUTCMonth(),
      bookingDateObj.getUTCDate(),
      0, 0, 0, 0
    ))

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: user.id,
        court_id: validatedData.courtId,
        court_number: validatedData.courtNumber,
        booking_date: normalizedBookingDate.toISOString(),
        start_time: startTime,
        end_time: endTime,
        duration: validatedData.duration,
        price: totalPrice,
        is_recurring: validatedData.isRecurring || false,
        recurring_pattern: validatedData.recurringPattern
          ? validatedData.recurringPattern
          : null,
        status: 'confirmed',
        payment_status: 'pending',
      })
      .select('*, court:courts(*)')
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform booking to match expected format
    const transformedBooking = {
      ...booking,
      userId: booking.user_id,
      courtId: booking.court_id,
      courtNumber: booking.court_number,
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      isRecurring: booking.is_recurring,
      recurringPattern: booking.recurring_pattern,
      paymentIntentId: booking.payment_intent_id,
      paymentStatus: booking.payment_status,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    }

    return NextResponse.json(transformedBooking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
