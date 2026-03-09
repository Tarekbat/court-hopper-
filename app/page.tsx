'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Court } from '@/types'
import CourtCard from '@/components/CourtCard'
import FilterBar, { FilterState } from '@/components/FilterBar'
import SearchBar from '@/components/SearchBar'
import WeeklyAvailability from '@/components/WeeklyAvailability'
import QuickActions from '@/components/QuickActions'
import UpcomingBookings from '@/components/UpcomingBookings'
import LoggedInDashboard from '@/components/LoggedInDashboard'
import FeaturedCourts from '@/components/FeaturedCourts'
import Header from '@/components/Header'
import HowItWorksSection from '@/components/HowItWorksSection'
import CommunitySection from '@/components/CommunitySection'
import ForBusinessSection from '@/components/ForBusinessSection'
import Footer from '@/components/Footer'
import MarqueeStrip from '@/components/MarqueeStrip'
import { Map, List } from '@/components/Icons'
import { useRouter } from 'next/navigation'

// Dynamically import MapView with SSR disabled (Leaflet requires browser APIs)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-200 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clay-terracotta mx-auto mb-4"></div>
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [showAvailableNow, setShowAvailableNow] = useState(false)
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null)
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>({
    surface: 'All',
    maxPrice: 100,
    minRating: 0,
    maxDistance: 50, // Increased default to show more courts
    amenities: [],
  })

  useEffect(() => {
    fetchCourts()
    fetchHeroImage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchHeroImage = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const settings = await response.json()
        setHeroImageUrl(settings.hero_image_url)
      }
    } catch (error) {
      console.error('Error fetching hero image:', error)
    }
  }

  const fetchCourts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim())
        console.log('Searching for:', searchQuery.trim())
      }
      if (filters.surface !== 'All') params.append('surface', filters.surface)
      if (filters.maxPrice < 100) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.minRating > 0) params.append('minRating', filters.minRating.toString())

      const apiUrl = `/api/courts?${params.toString()}`
      console.log('Fetching courts from:', apiUrl)
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('Failed to fetch courts')
      const data = await response.json()
      
      console.log('Fetched courts data:', data?.length || 0, 'courts', searchQuery ? `(search: "${searchQuery}")` : '')
      
      // If database is empty or returns no results, use mock data as fallback
      if (!data || data.length === 0) {
        console.log('No courts from API, using mock data')
        const { mockCourts } = await import('@/data/mockCourts')
        setCourts(mockCourts)
        return
      }
      
      // Transform API data to match Court type
      // Handle both snake_case (from Supabase) and camelCase
      const transformedCourts: Court[] = data.map((court: any) => {
        const totalCourts = court.total_courts || court.totalCourts || 1
        const lat = court.latitude ?? null
        const lng = court.longitude ?? null
        
        return {
          id: court.id,
          name: court.name,
          location: {
            address: court.address,
            city: court.city,
            state: court.state,
            zipCode: court.zip_code || court.zipCode || '',
            coordinates: {
              lat: lat,
              lng: lng,
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
          amenities: typeof court.amenities === 'string' ? JSON.parse(court.amenities) : (court.amenities || []),
          images: typeof court.images === 'string' ? JSON.parse(court.images) : (court.images || []),
          availableDays: typeof court.available_days === 'string' ? JSON.parse(court.available_days) : (typeof court.availableDays === 'string' ? JSON.parse(court.availableDays) : (court.available_days || court.availableDays || [])),
          totalCourts: totalCourts,
          courtNumbers: Array.from({ length: totalCourts }, (_, i) => `Court ${i + 1}`),
          timeSlots: {}, // Will be fetched per court when needed
          description: court.description || '',
        }
      })
      
      console.log('Transformed courts:', transformedCourts.length, 'courts with coordinates:', 
        transformedCourts.filter((c: Court) => c.location.coordinates.lat && c.location.coordinates.lng).length)
      
      setCourts(transformedCourts)
    } catch (error) {
      console.error('Error fetching courts:', error)
      // Fallback to mock data if API fails
      const { mockCourts } = await import('@/data/mockCourts')
      setCourts(mockCourts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('Search query changed:', searchQuery)
    fetchCourts()
    // Scroll to results if there's a search query
    if (searchQuery.trim()) {
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters])

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        court.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        court.location.city.toLowerCase().includes(searchQuery.toLowerCase())

      // Surface filter
      const matchesSurface = filters.surface === 'All' || court.surface === filters.surface

      // Price filter
      const matchesPrice = court.price.peak <= filters.maxPrice

      // Rating filter
      const matchesRating = court.rating >= filters.minRating

      // Distance filter - only apply if court has valid distance (> 0)
      // Courts with distance 0 (invalid coordinates) should still be shown
      const matchesDistance = court.distance === 0 || court.distance <= filters.maxDistance

      // Amenities filter
      const matchesAmenities =
        filters.amenities.length === 0 ||
        filters.amenities.every((amenity) => court.amenities.includes(amenity))

      // Available Now filter - simplified for now
      const matchesAvailableNow = !showAvailableNow || true

      return (
        matchesSearch &&
        matchesSurface &&
        matchesPrice &&
        matchesRating &&
        matchesDistance &&
        matchesAmenities &&
        matchesAvailableNow
      )
    })
  }, [courts, searchQuery, filters, showAvailableNow])

  // Add scroll animations - re-run when view mode or results change so list shows after switching from map
  useEffect(() => {
    let observer: IntersectionObserver | null = null

    const timeoutId = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible')
            }
          })
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      )

      const elements = document.querySelectorAll('.fade-in-up')
      elements.forEach((el) => observer!.observe(el))
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [filteredCourts, loading, viewMode])

  return (
    <div className="min-h-screen bg-beige">
      <Header />

      {/* Hero Section — Setra brand */}
      <section
        className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-[120px] pb-20 px-6 md:px-[60px]"
        style={{ background: '#F5F0EB' }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        {/* Large decorative italic S */}
        <div
          className="absolute right-[-40px] top-1/2 -translate-y-1/2 pointer-events-none select-none font-serif italic font-bold leading-none text-[#C41E2A]"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'min(50vw, 600px)',
            lineHeight: 0.8,
            opacity: 0.04,
          }}
          aria-hidden
        >
          S
        </div>

        <div className="relative z-[2] w-full max-w-[900px]">
          {/* Now Live in Seattle badge */}
          <div
            className="hero-anim-fade-up hero-delay-1 inline-flex items-center gap-2.5 rounded-[100px] py-2 pl-3 pr-[18px] mb-10"
            style={{ background: 'rgba(196,30,42,0.06)' }}
          >
            <div
              className="h-2 w-2 rounded-full bg-[#C41E2A] hero-pulse-dot shrink-0"
              aria-hidden
            />
            <span
              className="text-xs font-medium uppercase tracking-[0.1em] text-[#C41E2A]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Now Live in Seattle
            </span>
          </div>

          {/* Main heading */}
          <h1
            className="hero-anim-fade-up hero-delay-2 font-display font-medium text-[#1A1A1A] leading-[1.05] tracking-[-0.03em] mb-7"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(48px, 7vw, 88px)',
            }}
          >
            Your city&apos;s best
            <br />
            courts, <span className="text-[#C41E2A] italic">one tap</span>
            <br />
            away
          </h1>

          {/* Subtitle */}
          <p
            className="hero-anim-fade-up hero-delay-3 text-lg font-light text-[#8A8279] leading-[1.7] max-w-[480px] mb-12"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Discover premium tennis courts. Book instantly. Connect with players who match your level. The game starts here.
          </p>

          {/* CTAs + Search row */}
          <div className="hero-anim-fade-up hero-delay-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowFilters(true)
                  setTimeout(() => {
                    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }}
                className="btn-premium inline-flex items-center justify-center px-10 py-4 text-sm font-medium"
              >
                Find a Court
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary inline-flex items-center justify-center px-9 py-[15px] text-sm"
              >
                How It Works
              </button>
            </div>
            <div className="w-full sm:max-w-md">
              <SearchBar onSearch={setSearchQuery} />
            </div>
          </div>

          {/* Social proof */}
          <div className="hero-anim-fade-up hero-delay-5 mt-16 flex items-center gap-5">
            <div className="flex -space-x-2.5">
              {['#E8434E', '#C41E2A', '#9B1620', '#6B3A3E'].map((color, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold border-[2.5px] border-[#F5F0EB] shrink-0 first:ml-0"
                  style={{ background: color, marginLeft: i ? -10 : 0, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {['A', 'M', 'J', 'K'][i]}
                </div>
              ))}
            </div>
            <div>
              <span className="text-sm font-medium text-[#1A1A1A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>2,400+ players</span>
              <span className="text-sm font-light text-[#8A8279] ml-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>already on SETRA</span>
            </div>
          </div>

          {/* Quick Actions — preserved and integrated */}
          <div className="mt-12 hero-anim-fade-up hero-delay-5">
            <QuickActions
              onMapViewClick={() => {
                setShowAvailableNow(false)
                setShowFilters(true)
                setViewMode('map')
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
              onAvailableNowClick={() => {
                setSearchQuery('')
                setShowAvailableNow(true)
                setShowFilters(true)
                setViewMode('list')
                setFilters({ ...filters, maxDistance: 25 })
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
              onTopRatedClick={() => {
                setSearchQuery('')
                setShowAvailableNow(false)
                setShowFilters(true)
                setFilters({ ...filters, minRating: 4.5 })
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
            />
          </div>
        </div>
      </section>

      <MarqueeStrip />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-0 bg-beige">
        {/* Dashboard for logged-in users */}
        <div className="mb-16">
          <LoggedInDashboard />
        </div>

        {/* Filters Toggle */}
        <div className="mb-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-5 py-2.5 bg-white border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all text-sm font-medium text-ink"
            >
              {showFilters ? 'Hide' : 'Show'} filters
            </button>
            {showAvailableNow && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent-green/10 border border-accent-green/25 rounded-xl">
                <span className="text-sm font-medium text-accent-green">Available today</span>
                <button
                  onClick={() => setShowAvailableNow(false)}
                  className="text-accent-green hover:text-accent-green-dark font-semibold text-lg leading-none"
                  aria-label="Remove available now filter"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {courts.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-stone-soft rounded-xl p-1">
              <button
                onClick={() => {
                  setViewMode('list')
                  setShowFilters(true)
                }}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-ink text-white'
                    : 'text-stone hover:bg-beige'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setViewMode('map')
                  setShowFilters(true)
                  setTimeout(() => {
                    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                  }, 0)
                }}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'map'
                    ? 'bg-ink text-white'
                    : 'text-stone hover:bg-beige'
                }`}
                aria-label="Map view"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-8 relative z-0">
            <FilterBar onFilterChange={setFilters} />
          </div>
        )}

        {/* Results Section */}
        <div id="results-section" className="relative z-0">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-terracotta border-t-transparent mx-auto mb-4"></div>
              <p className="text-stone font-medium">Loading courts…</p>
            </div>
          ) : viewMode === 'map' ? (
            <>
              <div className="mb-10 fade-in-up">
                <h2 className="text-3xl md:text-4xl font-display text-ink mb-1">
                  {courts.length} {courts.length === 1 ? 'court' : 'courts'} found
                </h2>
                <p className="text-stone text-base">View on map</p>
              </div>

              {/* Map View */}
              <div className="mb-12 fade-in-up">
                <MapView
                  courts={courts}
                  onCourtClick={(court) => router.push(`/court/${court.id}`)}
                />
              </div>
            </>
          ) : (
            <>
              {/* List View - Show when list mode and has search/filters */}
              {(searchQuery.trim() || showFilters) && (
                <>
                  <div className="mb-10 fade-in-up">
                    <h2 className="text-3xl md:text-4xl font-display text-ink mb-1">
                      {filteredCourts.length} {filteredCourts.length === 1 ? 'court' : 'courts'} found
                      {searchQuery.trim() && (
                        <span className="text-xl font-sans font-normal text-stone ml-2">
                          for &quot;{searchQuery}&quot;
                        </span>
                      )}
                    </h2>
                    <p className="text-stone text-base">Refine with filters below</p>
                  </div>

                  {/* Court Grid */}
                  {filteredCourts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                      {filteredCourts.map((court, index) => (
                        <div key={court.id} className="fade-in-up" style={{ transitionDelay: `${index * 50}ms` }}>
                          <CourtCard court={court} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 mb-12 bg-white border border-stone-soft rounded-2xl shadow-sm fade-in-up">
                      <div className="text-6xl mb-5">🎾</div>
                      <p className="text-ink text-xl font-display mb-2">No courts found</p>
                      <p className="text-stone text-sm">Try adjusting your filters or search.</p>
                    </div>
                  )}
                </>
              )}

              {/* Featured Courts - Show when list mode and no search/filters */}
              {!searchQuery.trim() && !showFilters && (
                <div className="mb-12 fade-in-up">
                  <FeaturedCourts />
                </div>
              )}
            </>
          )}
        </div>

        <HowItWorksSection />

        <CommunitySection />

        <ForBusinessSection />

        {/* Weekly Availability Section */}
        <div className="mt-16 relative z-0 fade-in-up">
          <WeeklyAvailability />
        </div>
      </main>

      <Footer />
    </div>
  )
}

