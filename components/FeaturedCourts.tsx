'use client'

import { useMemo, useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { Court } from '@/types'
import CourtCard from '@/components/CourtCard'

interface FeaturedCourtsProps {
  excludeIds?: string[]
  courts?: Court[]
  /** Opens full court grid on the home page (parent should set filters + scroll). */
  onViewAll?: () => void
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function transformCourtRow(court: any): Court {
  const totalCourts = court.total_courts || court.totalCourts || 1
  const lat = court.latitude ?? null
  const lng = court.longitude ?? null

  const amenitiesRaw = court.amenities
  const imagesRaw = court.images
  const availableDaysRaw = court.available_days ?? court.availableDays

  const amenities =
    typeof amenitiesRaw === 'string'
      ? safeJsonParse<string[]>(amenitiesRaw, [])
      : Array.isArray(amenitiesRaw)
        ? (amenitiesRaw as string[])
        : []

  const filteredAmenities = amenities.filter(
    (a) => typeof a === 'string' && a.trim().length > 0
  )

  const images =
    typeof imagesRaw === 'string'
      ? safeJsonParse<string[]>(imagesRaw, [])
      : Array.isArray(imagesRaw)
        ? (imagesRaw as string[])
        : []

  const filteredImages = images.filter((i) => typeof i === 'string' && i.trim().length > 0)

  const availableDays =
    typeof availableDaysRaw === 'string'
      ? safeJsonParse<any[]>(availableDaysRaw, [])
      : Array.isArray(availableDaysRaw)
        ? availableDaysRaw
        : []

  return {
    id: court.id,
    name: court.name,
    location: {
      address: court.address,
      city: court.city,
      state: court.state,
      zipCode: court.zip_code || court.zipCode || '',
      coordinates: { lat, lng },
    },
    distance: court.distance || 0,
    price: {
      peak: court.peak_price || court.peakPrice || 0,
      offPeak: court.off_peak_price || court.offPeakPrice || 0,
    },
    surface: court.surface,
    rating: court.rating || 0,
    reviewCount: court.review_count || court.reviewCount || 0,
    amenities: filteredAmenities,
    images: filteredImages,
    availableDays,
    totalCourts,
    courtNumbers: Array.from({ length: totalCourts }, (_, i) => `Court ${i + 1}`),
    timeSlots: {},
    description: court.description || '',
  }
}

export default function FeaturedCourts({ excludeIds = [], courts: propCourts, onViewAll }: FeaturedCourtsProps) {
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
          const { mockCourts } = await import('@/data/mockCourts')
          setCourts(mockCourts)
          return
        }

        setCourts(data.map(transformCourtRow))
      } catch (error) {
        console.error('Error fetching courts:', error)
        const { mockCourts } = await import('@/data/mockCourts')
        setCourts(mockCourts)
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

  /** Hours today with ≥1 court free (matches batch API 7am–9pm grid). */
  const [slotsTodayByCourtId, setSlotsTodayByCourtId] = useState<Record<string, number>>({})
  const featuredIdsKey = featuredCourts.map((c) => c.id).join(',')

  useEffect(() => {
    if (!featuredIdsKey) return
    let cancelled = false
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    const run = async () => {
      try {
        const res = await fetch(
          `/api/courts/availability?courtIds=${encodeURIComponent(featuredIdsKey)}&dates=${encodeURIComponent(todayStr)}&includeSlotCounts=1`
        )
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!data?.slotCounts || cancelled) return
        const next: Record<string, number> = {}
        for (const id of featuredIdsKey.split(',')) {
          if (!id) continue
          const n = data.slotCounts[id]?.[todayStr]
          if (typeof n === 'number') next[id] = n
        }
        if (!cancelled) setSlotsTodayByCourtId(next)
      } catch {
        if (!cancelled) setSlotsTodayByCourtId({})
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [featuredIdsKey])

  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeCardIndex, setActiveCardIndex] = useState(0)

  useEffect(() => {
    const refs = cardRefs.current
    if (refs.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const index = refs.indexOf(entry.target as HTMLDivElement)
          if (index !== -1) setActiveCardIndex(index)
        })
      },
      { root: null, rootMargin: '0px', threshold: 0.5 }
    )
    refs.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [featuredCourts.length])

  if (courts.length === 0) {
    return (
      <section
        className="featured-courts-section animate-fade-in"
        style={{ background: '#FFFFFF', padding: '100px 60px' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-terracotta border-t-transparent mx-auto mb-4"></div>
          <p className="text-stone font-medium">Loading featured courts…</p>
        </div>
      </section>
    )
  }

  if (featuredCourts.length === 0) {
    return null
  }

  return (
    <section
      className="featured-courts-section animate-fade-in"
      style={{
        background: '#FFFFFF',
        padding: '100px 60px',
      }}
    >
      <div
        className="featured-courts-header flex flex-wrap justify-between items-end gap-4"
        style={{ marginBottom: '56px' }}
      >
        <div>
          <span
            className="block uppercase tracking-[0.2em] font-medium"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              color: '#C41E2A',
              marginBottom: '14px',
            }}
          >
            Featured
          </span>
          <h2
            className="font-display font-medium text-[#1A1A1A] leading-tight"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 4vw, 48px)',
            }}
          >
            Curated for <span className="italic text-[#C41E2A]">you</span>
          </h2>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-2 uppercase font-medium tracking-[0.06em] transition-opacity hover:opacity-80 bg-transparent border-none cursor-pointer p-0"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#C41E2A',
            }}
          >
            View all courts →
          </button>
        ) : (
          <a
            href="#results-section"
            className="inline-flex items-center gap-2 uppercase font-medium tracking-[0.06em] transition-opacity hover:opacity-80"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#C41E2A',
            }}
          >
            View all courts →
          </a>
        )}
      </div>
      <div className="featured-courts-cards flex flex-wrap gap-7" style={{ gap: '28px' }}>
        {featuredCourts.map((court, i) => (
          <div
            key={court.id}
            ref={(el) => { cardRefs.current[i] = el }}
            className="featured-court-snap"
          >
            <CourtCard
              court={court}
              variant="featured"
              slotsTodayOverride={slotsTodayByCourtId[court.id]}
            />
          </div>
        ))}
      </div>
      <div className="featured-courts-dots flex justify-center gap-2 mt-4" aria-hidden>
        {featuredCourts.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-colors duration-200"
            style={{
              width: 6,
              height: 6,
              background: i === activeCardIndex ? '#C41E2A' : '#E8E0D8',
            }}
          />
        ))}
      </div>
    </section>
  )
}



