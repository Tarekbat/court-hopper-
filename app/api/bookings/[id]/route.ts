import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        court:courts(*),
        user:users!bookings_user_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq('id', params.id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user owns the booking
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    return NextResponse.json(transformedBooking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status: newStatus } = body

    // Only allow cancellation via PATCH
    if (newStatus !== 'cancelled') {
      return NextResponse.json(
        { error: 'PATCH endpoint only supports cancellation. Use status: "cancelled"' },
        { status: 400 }
      )
    }

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user owns the booking
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    // Check if booking is in the past (compare date + time, not just date)
    const now = new Date()
    const bookingDate = new Date(booking.booking_date)
    // Combine booking date with start time to get the actual booking start datetime
    const [hours, minutes] = booking.start_time.split(':').map(Number)
    const bookingStartDateTime = new Date(bookingDate)
    bookingStartDateTime.setUTCHours(hours, minutes, 0, 0)
    
    if (bookingStartDateTime < now) {
      return NextResponse.json(
        { error: 'Cannot cancel past bookings' },
        { status: 400 }
      )
    }

    // Update booking status to cancelled
    const { data: cancelledBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', params.id)
      .select('*, court:courts(*)')
      .single()

    if (updateError) {
      console.error('Error cancelling booking:', updateError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform booking to match expected format
    const transformedBooking = {
      ...cancelledBooking,
      userId: cancelledBooking.user_id,
      courtId: cancelledBooking.court_id,
      courtNumber: cancelledBooking.court_number,
      bookingDate: cancelledBooking.booking_date,
      startTime: cancelledBooking.start_time,
      endTime: cancelledBooking.end_time,
      isRecurring: cancelledBooking.is_recurring,
      recurringPattern: cancelledBooking.recurring_pattern,
      paymentIntentId: cancelledBooking.payment_intent_id,
      paymentStatus: cancelledBooking.payment_status,
      createdAt: cancelledBooking.created_at,
      updatedAt: cancelledBooking.updated_at,
    }

    // TODO: Process refund if payment was made
    // if (booking.payment_status === 'paid' && booking.payment_intent_id) {
    //   // Refund logic here
    // }

    return NextResponse.json(transformedBooking)
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user owns the booking
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    // Check if booking is in the past (compare date + time, not just date)
    const now = new Date()
    const bookingDate = new Date(booking.booking_date)
    // Combine booking date with start time to get the actual booking start datetime
    const [hours, minutes] = booking.start_time.split(':').map(Number)
    const bookingStartDateTime = new Date(bookingDate)
    bookingStartDateTime.setUTCHours(hours, minutes, 0, 0)
    
    if (bookingStartDateTime < now) {
      return NextResponse.json(
        { error: 'Cannot cancel past bookings' },
        { status: 400 }
      )
    }

    // Update booking status to cancelled
    const { data: cancelledBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', params.id)
      .select('*, court:courts(*)')
      .single()

    if (updateError) {
      console.error('Error cancelling booking:', updateError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform booking to match expected format
    const transformedBooking = {
      ...cancelledBooking,
      userId: cancelledBooking.user_id,
      courtId: cancelledBooking.court_id,
      courtNumber: cancelledBooking.court_number,
      bookingDate: cancelledBooking.booking_date,
      startTime: cancelledBooking.start_time,
      endTime: cancelledBooking.end_time,
      isRecurring: cancelledBooking.is_recurring,
      recurringPattern: cancelledBooking.recurring_pattern,
      paymentIntentId: cancelledBooking.payment_intent_id,
      paymentStatus: cancelledBooking.payment_status,
      createdAt: cancelledBooking.created_at,
      updatedAt: cancelledBooking.updated_at,
    }

    // TODO: Process refund if payment was made
    // if (booking.payment_status === 'paid' && booking.payment_intent_id) {
    //   // Refund logic here
    // }

    return NextResponse.json(transformedBooking)
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
