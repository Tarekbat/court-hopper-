import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const surface = searchParams.get('surface')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const search = searchParams.get('search')

    let query = supabase.from('courts').select('*')

    // Apply filters
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    if (surface && surface !== 'All') {
      query = query.eq('surface', surface)
    }

    if (maxPrice) {
      query = query.lte('peak_price', parseFloat(maxPrice))
    }

    if (minRating) {
      query = query.gte('rating', parseFloat(minRating))
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`
      )
    }

    // Get bookings count for each court
    const { data: courts, error } = await query.order('rating', { ascending: false })

    if (error) {
      console.error('Error fetching courts:', error)
      return NextResponse.json([])
    }

    // Get booking counts for confirmed bookings
    if (courts && courts.length > 0) {
      const courtIds = courts.map((c) => c.id)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('court_id')
        .in('court_id', courtIds)
        .eq('status', 'confirmed')

      const bookingCounts = bookings?.reduce((acc: any, booking) => {
        acc[booking.court_id] = (acc[booking.court_id] || 0) + 1
        return acc
      }, {})

      // Add booking counts to courts
      const courtsWithCounts = courts.map((court) => ({
        ...court,
        _count: {
          bookings: bookingCounts?.[court.id] || 0,
        },
      }))

      return NextResponse.json(courtsWithCounts || [])
    }

    return NextResponse.json(courts || [])
  } catch (error) {
    console.error('Error fetching courts:', error)
    // Return empty array instead of error to allow frontend to use mock data
    return NextResponse.json([])
  }
}
