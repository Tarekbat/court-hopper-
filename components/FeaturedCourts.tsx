'use client'

import { useMemo } from 'react'
import { Court } from '@/types'
import { mockCourts } from '@/data/mockCourts'
import CourtCard from '@/components/CourtCard'

interface FeaturedCourtsProps {
  excludeIds?: string[]
}

export default function FeaturedCourts({ excludeIds = [] }: FeaturedCourtsProps) {
  const featuredCourts = useMemo(() => {
    return mockCourts
      .filter((court) => !excludeIds.includes(court.id))
      .sort((a, b) => {
        // Sort by rating first, then by distance
        if (b.rating !== a.rating) {
          return b.rating - a.rating
        }
        return a.distance - b.distance
      })
      .slice(0, 6)
  }, [excludeIds])

  if (featuredCourts.length === 0) {
    return null
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Courts</h2>
        <p className="text-gray-600">Top-rated courts near you</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredCourts.map((court) => (
          <CourtCard key={court.id} court={court} />
        ))}
      </div>
    </div>
  )
}



