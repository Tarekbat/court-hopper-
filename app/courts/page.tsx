'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import CourtCard from '@/components/CourtCard'
import { Court } from '@/types'

function toCourt(court: any): Court {
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
        lat: court.latitude ?? null,
        lng: court.longitude ?? null,
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
    amenities: Array.isArray(court.amenities) ? court.amenities : [],
    images: Array.isArray(court.images) ? court.images : [],
    availableDays: Array.isArray(court.available_days) ? court.available_days : [],
    totalCourts: totalCourts,
    courtNumbers: Array.from({ length: totalCourts }, (_, i) => `Court ${i + 1}`),
    timeSlots: {},
    description: court.description || '',
  }
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/courts', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch courts')
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) {
          setCourts(data.map(toCourt))
        } else {
          const { mockCourts } = await import('@/data/mockCourts')
          if (!cancelled) setCourts(mockCourts)
        }
      } catch {
        const { mockCourts } = await import('@/data/mockCourts')
        if (!cancelled) setCourts(mockCourts)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-beige">
      <Header />
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-12 md:pt-28">
        <h1 className="text-3xl font-display text-ink mb-2">Find a court</h1>
        <p className="text-sm text-stone mb-6">Browse available courts.</p>
        {loading ? (
          <p className="text-stone">Loading courts...</p>
        ) : courts.length === 0 ? (
          <div className="bg-white border border-stone-soft rounded-2xl p-8 text-center">
            <p className="text-ink font-medium">No courts found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
