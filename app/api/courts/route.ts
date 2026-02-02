import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const surface = searchParams.get('surface')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const search = searchParams.get('search')
    const userLat = searchParams.get('lat') // Optional user latitude
    const userLng = searchParams.get('lng') // Optional user longitude
    
    // Default reference point: Miami, FL (center of the area where most courts are)
    const referenceLat = userLat ? parseFloat(userLat) : 25.7617
    const referenceLng = userLng ? parseFloat(userLng) : -80.1918

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

    if (search && search.trim()) {
      // Search across name, address, and city fields
      // Use Supabase's or() method with proper PostgREST syntax
      const searchTerm = search.trim()
      const searchPattern = `%${searchTerm}%`
      
      // PostgREST or() syntax: field.operator.value,field2.operator.value
      // The % wildcards should be included in the value
      query = query.or(
        `name.ilike.${searchPattern},address.ilike.${searchPattern},city.ilike.${searchPattern}`
      )
      
      console.log('Applying search filter:', searchTerm)
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

      // Add booking counts and calculate distance for courts
      const courtsWithCounts = courts.map((court) => {
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

        return {
          ...court,
          images, // Ensure images is always an array of valid URLs
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
          // Serialize Date objects to ISO strings to avoid Next.js serialization warnings
          created_at: court.created_at ? new Date(court.created_at).toISOString() : null,
          updated_at: court.updated_at ? new Date(court.updated_at).toISOString() : null,
          _count: {
            bookings: bookingCounts?.[court.id] || 0,
          },
        }
      })

      // Sort by distance if user location is provided, otherwise by rating
      if (userLat && userLng) {
        courtsWithCounts.sort((a, b) => a.distance - b.distance)
      }

      return NextResponse.json(courtsWithCounts || [])
    }

    return NextResponse.json(courts || [])
  } catch (error) {
    console.error('Error fetching courts:', error)
    // Return empty array instead of error to allow frontend to use mock data
    return NextResponse.json([])
  }
}
