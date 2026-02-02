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
import FeaturedCourts from '@/components/FeaturedCourts'
import Header from '@/components/Header'
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

      {/* Hero Section */}
      <section className="relative text-white py-28 md:py-36 min-h-[560px] md:min-h-[640px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroImageUrl ? (
            <div className="relative w-full h-full">
              <img
                src={heroImageUrl}
                alt="Tennis Courts"
                className="w-full h-full object-cover scale-105"
                style={{ transform: 'scale(1.05)' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) fallback.classList.remove('hidden')
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/55" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/15" />
            </div>
          ) : null}
          <div className={`absolute inset-0 bg-gradient-to-br from-beige via-beige-dark to-beige ${heroImageUrl ? 'hidden' : ''}`} />
        </div>
        <div className="absolute inset-0 bg-black/35 z-[1]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-display-xl font-display mb-6 leading-[0.98] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
              <span className="block">Feel the</span>
              <span className="block mt-1">movement</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-normal leading-relaxed mb-10 drop-shadow-md">
              Premium courts and world-class facilities. Book your court and elevate your game.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-10 animate-slide-up">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          <div className="max-w-2xl mx-auto text-center animate-slide-up">
            <button
              onClick={() => {
                setShowFilters(true)
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
              className="btn-premium px-10 py-3.5 text-white font-semibold text-base rounded-xl"
            >
              Book a court
            </button>
          </div>

          {/* Quick Actions */}
          <div className="max-w-6xl mx-auto mt-16 animate-slide-up">
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
                setFilters({
                  ...filters,
                  maxDistance: 25,
                })
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
              onTopRatedClick={() => {
                setSearchQuery('')
                setShowAvailableNow(false)
                setShowFilters(true)
                setFilters({
                  ...filters,
                  minRating: 4.5,
                })
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-0 bg-beige">
        {/* Upcoming Bookings Section */}
        <div className="mb-16">
          <UpcomingBookings />
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

        {/* Weekly Availability Section */}
        <div className="mt-16 relative z-0 fade-in-up">
          <WeeklyAvailability />
        </div>
      </main>
    </div>
  )
}

