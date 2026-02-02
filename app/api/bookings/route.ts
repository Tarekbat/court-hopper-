import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { addHours, parse, format } from 'date-fns'
import { randomUUID } from 'crypto'

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
    const response = NextResponse.next()
    const supabase = createServerSupabaseClient(request, response)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
    }
    
    if (!session) {
      console.error('No session found. Cookies:', request.cookies.getAll().map((c: { name: string; value: string }) => c.name))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'confirmed'
    const upcoming = searchParams.get('upcoming') === 'true'

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

    if (upcoming) {
      query = query.gte('booking_date', new Date().toISOString())
        .order('booking_date', { ascending: true })
    } else {
      query = query.order('booking_date', { ascending: false })
    }

    const { data: bookings, error } = await query

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

    // Return response with any cookie updates
    const jsonResponse = NextResponse.json(transformedBookings)
    // Copy any cookie updates from the supabase client response
    response.cookies.getAll().forEach((cookie: { name: string; value: string }) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return jsonResponse
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

    // Calculate price
    const hour = parseInt(startTime.split(':')[0])
    const isPeakTime = (hour >= 17 && hour < 20) || hour === 12
    const pricePerHour = isPeakTime ? court.peak_price : court.off_peak_price
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
