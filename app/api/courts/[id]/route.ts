import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format, parse, addHours } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // ISO date string

    // Get court with reviews
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select(
        `
        *,
        reviews (
          *,
          user:users!reviews_user_id_fkey (
            id,
            name,
            image
          )
        )
      `
      )
      .eq('id', params.id)
      .single()

    if (courtError || !court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    // Sort reviews by created_at descending and limit to 10
    if (court.reviews) {
      court.reviews = court.reviews
        .sort((a: any, b: any) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        .slice(0, 10)
    }

    // Get availability for the requested date
    let availability: any[] = []
    if (date) {
      const requestedDate = new Date(date)
      const dayOfWeek = requestedDate.getDay() // 0 = Sunday, 1 = Monday, etc.

      // Get all bookings for this date
      const startOfDay = new Date(requestedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(requestedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('court_id', params.id)
        .eq('status', 'confirmed')
        .gte('booking_date', startOfDay.toISOString())
        .lte('booking_date', endOfDay.toISOString())

      // Generate time slots (e.g., 7 AM to 9 PM)
      const timeSlots = []
      for (let hour = 7; hour <= 21; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`
        const endTime = format(addHours(parse(time, 'HH:mm', new Date()), 1), 'HH:mm')

        // Check which courts are available at this time
        const bookedCourts = (bookings || [])
          .filter((b) => {
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
          .map((b) => b.court_number)

        const availableCourts = Array.from({ length: court.total_courts }, (_, i) => {
          const courtNumber = `Court ${i + 1}`
          return {
            number: courtNumber,
            isAvailable: !bookedCourts.includes(courtNumber),
          }
        })

        timeSlots.push({
          time,
          availableCourts,
        })
      }

      availability = timeSlots
    }

    // Transform court data to match expected format
    const transformedCourt = {
      ...court,
      zipCode: court.zip_code,
      peakPrice: court.peak_price,
      offPeakPrice: court.off_peak_price,
      reviewCount: court.review_count,
      totalCourts: court.total_courts,
      createdAt: court.created_at,
      updatedAt: court.updated_at,
      availability,
    }

    return NextResponse.json(transformedCourt)
  } catch (error) {
    console.error('Error fetching court:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
