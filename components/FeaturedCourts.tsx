'use client'

import { useMemo, useEffect, useState } from 'react'
import { Court } from '@/types'
import CourtCard from '@/components/CourtCard'

interface FeaturedCourtsProps {
  excludeIds?: string[]
  courts?: Court[]
}

export default function FeaturedCourts({ excludeIds = [], courts: propCourts }: FeaturedCourtsProps) {
  const [courts, setCourts] = useState<Court[]>(propCourts || [])

  // Fetch courts if not provided
  useEffect(() => {
    if (propCourts && propCourts.length > 0) {
      setCourts(propCourts)
      return
    }

    const fetchCourts = async () => {
      try {
        const response = await fetch('/api/courts')
        if (!response.ok) throw new Error('Failed to fetch courts')
        const data = await response.json()
        
        if (!data || data.length === 0) {
          setCourts([])
          return
        }
        
        // Transform API data to match Court type
        const transformedCourts: Court[] = data.map((court: any) => {
          const totalCourts = court.total_courts || court.totalCourts || 1
          
          return {
            id: court.id,
            name: court.name,
            location: {
              address: court.address,
              city: court.city,
              state: court.state,
              zipCode: court.zip_code || court.zipCode || '',
              coordinates: {
                lat: court.latitude || 0,
                lng: court.longitude || 0,
              },
            },
            distance: court.distance || 0,
            price: {
              peak: court.peak_price || court.peakPrice || 0,
              offPeak: court.off_peak_price || court.offPeakPrice || 0,
            },
            surface: court.surface,
            rating: court.rating || 0,
            reviewCount: court.review_count || court.reviewCount || 0,
            amenities: typeof court.amenities === 'string' 
              ? JSON.parse(court.amenities) 
              : (court.amenities || []),
            images: typeof court.images === 'string' 
              ? JSON.parse(court.images) 
              : (court.images || []),
            availableDays: typeof court.available_days === 'string'
              ? JSON.parse(court.available_days)
              : (typeof court.availableDays === 'string'
                ? JSON.parse(court.availableDays)
                : (court.available_days || court.availableDays || [])),
            totalCourts: totalCourts,
            courtNumbers: Array.from({ length: totalCourts }, (_, i) => `Court ${i + 1}`),
            timeSlots: {},
            description: court.description || '',
          }
        })
        
        setCourts(transformedCourts)
      } catch (error) {
        console.error('Error fetching courts:', error)
        setCourts([])
      }
    }

    fetchCourts()
  }, [propCourts])

  const featuredCourts = useMemo(() => {
    return courts
      .filter((court) => !excludeIds.includes(court.id))
      .sort((a, b) => {
        // Sort by rating first, then by distance
        if (b.rating !== a.rating) {
          return b.rating - a.rating
        }
        return a.distance - b.distance
      })
      .slice(0, 6)
  }, [courts, excludeIds])

  if (featuredCourts.length === 0) {
    return null
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-display text-ink mb-1">Featured courts</h2>
        <p className="text-stone text-base">Top-rated courts near you</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredCourts.map((court) => (
          <CourtCard key={court.id} court={court} />
        ))}
      </div>
    </div>
  )
}



