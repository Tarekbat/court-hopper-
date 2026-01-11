import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { addHours, parse, format } from 'date-fns'

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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'confirmed'
    const upcoming = searchParams.get('upcoming') === 'true'

    let query = supabase
      .from('bookings')
      .select('*, court:courts(*)')
      .eq('user_id', user.id)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (upcoming) {
      query = query.gte('booking_date', new Date().toISOString())
    } else {
      query = query.order('booking_date', { ascending: true })
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform bookings to match expected format
    const transformedBookings = (bookings || []).map((booking: any) => ({
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
    }))

    return NextResponse.json(transformedBookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
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
    const startOfDay = new Date(bookingDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(bookingDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get all bookings for this court, date, and court number
    const { data: existingBookings } = await supabase
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

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        court_id: validatedData.courtId,
        court_number: validatedData.courtNumber,
        booking_date: new Date(validatedData.bookingDate).toISOString(),
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
