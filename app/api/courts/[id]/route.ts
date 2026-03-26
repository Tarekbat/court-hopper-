import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { format, parse, addHours } from 'date-fns'
import { z } from 'zod'

// Haversine formula to calculate distance between two coordinates in miles
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // ISO date string
    const userLat = searchParams.get('lat') // Optional user latitude
    const userLng = searchParams.get('lng') // Optional user longitude
    
    // Default reference point: Miami, FL
    const referenceLat = userLat ? parseFloat(userLat) : 25.7617
    const referenceLng = userLng ? parseFloat(userLng) : -80.1918

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
      .eq('status', 'active')
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
    // Always generate time slots from 7 AM to 9 PM (7:00 to 21:00)
    let availability: any[] = []
    
    // Fetch bookings once for the entire day (if date provided)
    // Use admin client to bypass RLS and see all bookings for availability check
    let bookings: any[] = []
    if (date) {
      const requestedDate = new Date(date)
      // Normalize to UTC to avoid timezone issues
      const startOfDay = new Date(Date.UTC(
        requestedDate.getUTCFullYear(),
        requestedDate.getUTCMonth(),
        requestedDate.getUTCDate(),
        0, 0, 0, 0
      ))
      const endOfDay = new Date(Date.UTC(
        requestedDate.getUTCFullYear(),
        requestedDate.getUTCMonth(),
        requestedDate.getUTCDate(),
        23, 59, 59, 999
      ))

      // Use admin client to bypass RLS - we need to see ALL bookings for availability
      const adminSupabase = createAdminClient()
      const { data: bookingsData } = await adminSupabase
        .from('bookings')
        .select('start_time, end_time, court_number')
        .eq('court_id', params.id)
        .eq('status', 'confirmed')
        .gte('booking_date', startOfDay.toISOString())
        .lte('booking_date', endOfDay.toISOString())
      
      bookings = bookingsData || []
    }
    
    // Generate time slots (7 AM to 9 PM) - always return these regardless of date
    const timeSlots = []
    for (let hour = 7; hour <= 21; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      const endTime = format(addHours(parse(time, 'HH:mm', new Date()), 1), 'HH:mm')

      // Check which courts are booked at this time slot
      const bookedCourts = bookings
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

      // Create available courts list - all courts are available unless booked
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

    // Calculate distance if court has valid coordinates
    let distance = court.distance
    if (
      court.latitude != null &&
      court.longitude != null &&
      !isNaN(court.latitude) &&
      !isNaN(court.longitude) &&
      court.latitude !== 0 &&
      court.longitude !== 0
    ) {
      // Calculate distance if not already set or if it's 0
      if (!distance || distance === 0) {
        distance = calculateDistance(
          referenceLat,
          referenceLng,
          court.latitude,
          court.longitude
        )
      }
    } else {
      distance = 0
    }

    // Ensure images is properly parsed from JSONB
    let images = court.images
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images)
      } catch (e) {
        console.error('Error parsing images for court', court.id, e)
        images = []
      }
    }
    if (!Array.isArray(images)) {
      images = []
    }
    
    // Validate image URLs - ensure they're full URLs, not just IDs
    images = images.map((img: any) => {
      if (typeof img === 'string') {
        // Remove any whitespace
        const trimmedImg = img.trim()
        
        // Skip empty strings
        if (!trimmedImg) return null
        
        // If it's just a photo ID pattern (photo- followed by numbers and letters), it's invalid
        if (/^photo-\d+-\w+$/.test(trimmedImg) && !trimmedImg.includes('http')) {
          console.warn(`Invalid image URL (photo ID without domain) for court ${court.id}: ${trimmedImg}`)
          return null
        }
        
        // If it starts with "photo-" but doesn't contain a full URL, it's invalid
        if (trimmedImg.startsWith('photo-') && !trimmedImg.includes('unsplash.com') && !trimmedImg.startsWith('http')) {
          console.warn(`Invalid image URL for court ${court.id}: ${trimmedImg}`)
          return null
        }
        
        // Ensure it's a full URL or a relative path
        if (!trimmedImg.startsWith('http://') && !trimmedImg.startsWith('https://') && !trimmedImg.startsWith('/')) {
          console.warn(`Image URL missing protocol for court ${court.id}: ${trimmedImg}`)
          return null
        }
        
        return trimmedImg
      }
      return null
    }).filter((img: any) => img !== null && img !== undefined)

    const [whoPlaysHere, upcomingPlayDays] = await Promise.all([
      supabase
        .from('play_partner_profiles')
        .select('user_id, users ( id, name, image )')
        .eq('is_active', true)
        .limit(100),
      supabase
        .from('group_events')
        .select('id, title, starts_at, group_id, location_label')
        .ilike('location_label', `%${court.name}%`)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(10),
    ])

    const players = (whoPlaysHere.data ?? [])
      .filter((r: any) =>
        JSON.stringify(r).toLowerCase().includes(String(court.name).toLowerCase())
      )
      .slice(0, 12)
      .map((r: any) => ({
        id: r.users?.id ?? r.user_id,
        name: r.users?.name ?? 'Player',
        image: r.users?.image ?? null,
      }))

    // Transform court data to match expected format
    // Serialize Date objects to ISO strings to avoid Next.js serialization warnings
    const transformedCourt = {
      ...court,
      images, // Ensure images is always an array
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      zipCode: court.zip_code,
      peakPrice: court.peak_price,
      offPeakPrice: court.off_peak_price,
      reviewCount: court.review_count,
      totalCourts: court.total_courts,
      createdAt: court.created_at ? new Date(court.created_at).toISOString() : null,
      updatedAt: court.updated_at ? new Date(court.updated_at).toISOString() : null,
      availability,
      // Serialize review dates if reviews exist
      reviews: court.reviews ? court.reviews.map((review: any) => ({
        ...review,
        created_at: review.created_at ? new Date(review.created_at).toISOString() : null,
        updated_at: review.updated_at ? new Date(review.updated_at).toISOString() : null,
      })) : [],
      upcoming_play_days: (upcomingPlayDays.data ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        starts_at: e.starts_at,
        group_id: e.group_id,
        location_label: e.location_label,
      })),
      who_plays_here: players,
    }

    return NextResponse.json(transformedCourt)
  } catch (error) {
    console.error('Error fetching court:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(2).max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = reviewSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { error } = await supabase.from('reviews').upsert({
    court_id: params.id,
    user_id: session.user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
