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
      <p className="text-gray-500">Loading map...</p>
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
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>({
    surface: 'All',
    maxPrice: 100,
    minRating: 0,
    maxDistance: 20,
    amenities: [],
  })

  useEffect(() => {
    fetchCourts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCourts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filters.surface !== 'All') params.append('surface', filters.surface)
      if (filters.maxPrice < 100) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.minRating > 0) params.append('minRating', filters.minRating.toString())

      const response = await fetch(`/api/courts?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch courts')
      const data = await response.json()
      
      // Transform API data to match Court type
      const transformedCourts: Court[] = data.map((court: any) => ({
        id: court.id,
        name: court.name,
        location: {
          address: court.address,
          city: court.city,
          state: court.state,
          zipCode: court.zipCode,
          coordinates: {
            lat: court.latitude,
            lng: court.longitude,
          },
        },
        distance: court.distance || 0,
        price: {
          peak: court.peakPrice,
          offPeak: court.offPeakPrice,
        },
        surface: court.surface,
        rating: court.rating,
        reviewCount: court.reviewCount,
        amenities: typeof court.amenities === 'string' ? JSON.parse(court.amenities) : court.amenities,
        images: typeof court.images === 'string' ? JSON.parse(court.images) : court.images,
        availableDays: typeof court.availableDays === 'string' ? JSON.parse(court.availableDays) : court.availableDays,
        totalCourts: court.totalCourts,
        courtNumbers: Array.from({ length: court.totalCourts }, (_, i) => `Court ${i + 1}`),
        timeSlots: {}, // Will be fetched per court when needed
        description: court.description,
      }))
      
      setCourts(transformedCourts)
    } catch (error) {
      console.error('Error fetching courts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourts()
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

      // Distance filter
      const matchesDistance = court.distance <= filters.maxDistance

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

  return (
    <div className="min-h-screen bg-clay-cream">
      <Header />

      {/* Hero Section */}
      <section className="bg-hero-gradient text-white py-32 md:py-40 relative z-10 overflow-hidden">
        {/* Dark overlay for better contrast */}
        <div className="absolute inset-0 bg-clay-rust-dark/50"></div>
        
        {/* Clay court pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23 11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 4c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM60 91c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM35 41c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 60c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%23FFF8DC' fill-opacity='0.3' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }}></div>
        
        {/* Terracotta accent lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-terracotta"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-terracotta"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-block mb-6 px-4 py-2 bg-clay-terracotta/30 backdrop-blur-sm rounded-full border border-clay-terracotta/50">
              <span className="text-clay-cream text-sm font-bold tracking-[0.2em] uppercase">Elite Experience</span>
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-bold mb-8 leading-[1.1]">
              <span className="text-white" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)' }}>Reserve Your</span>
              <span className="block text-clay-cream mt-2" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)' }}>Perfect Court</span>
            </h1>
            <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto font-semibold leading-relaxed" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)' }}>
              Exclusive access to premium tennis facilities. Experience luxury, precision, and excellence.
            </p>
          </div>
          
          {/* Search Bar in Hero */}
          <div className="max-w-4xl mx-auto mb-12 animate-slide-up">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* Quick Actions */}
          <div className="max-w-6xl mx-auto animate-slide-up">
            <QuickActions 
              onMapViewClick={() => {
                setShowAvailableNow(false)
                setShowFilters(true)
                setViewMode('map')
                // Scroll to results section
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
              onAvailableNowClick={() => {
                // Filter for courts with availability today
                setSearchQuery('')
                setShowAvailableNow(true)
                setShowFilters(true)
                setViewMode('list')
                setFilters({
                  ...filters,
                  maxDistance: 25, // Show wider range for "available now"
                })
                // Scroll to results section
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
                  minRating: 4.5, // Show only highly rated courts
                })
                // Scroll to results section
                setTimeout(() => {
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-0">
        {/* Upcoming Bookings Section */}
        <div className="mb-12">
          <UpcomingBookings />
        </div>

        {/* Filters Toggle */}
        <div className="mb-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 glass border border-clay-terracotta/30 rounded-2xl hover:border-clay-terracotta/50 transition-all text-sm font-bold text-clay-rust-dark shadow-luxury hover:shadow-luxury-clay"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            {showAvailableNow && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-clay-terracotta/20 border-2 border-clay-terracotta/40 rounded-2xl">
                <span className="text-sm font-bold text-clay-terracotta">Available Today</span>
                <button
                  onClick={() => setShowAvailableNow(false)}
                  className="text-clay-terracotta hover:text-clay-orange font-bold text-lg leading-none"
                  aria-label="Remove available now filter"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {filteredCourts.length > 0 && (
            <div className="flex items-center gap-2 glass rounded-2xl p-2 shadow-luxury border border-clay-terracotta/30">
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? 'bg-gradient-clay text-white shadow-luxury-clay'
                    : 'text-clay-rust-dark/60 hover:bg-clay-cream/50'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'map'
                    ? 'bg-gradient-clay text-white shadow-luxury-clay'
                    : 'text-clay-rust-dark/60 hover:bg-clay-cream/50'
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
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-clay-terracotta border-t-transparent mx-auto mb-4"></div>
              <p className="text-clay-rust-dark font-medium">Loading courts...</p>
            </div>
          ) : searchQuery || showFilters ? (
            <>
              {/* Results Header */}
              <div className="mb-10">
                <h2 className="text-4xl font-display font-bold text-clay-rust-dark mb-2">
                  {filteredCourts.length} {filteredCourts.length === 1 ? 'Court' : 'Courts'} Found
                </h2>
                <p className="text-clay-rust-dark/70 font-medium">Premium facilities available</p>
              </div>

              {/* Court Grid or Map View */}
              {filteredCourts.length > 0 ? (
                viewMode === 'list' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {filteredCourts.map((court) => (
                      <CourtCard key={court.id} court={court} />
                    ))}
                  </div>
                ) : (
                  <div className="mb-12">
                    <MapView
                      courts={filteredCourts}
                      onCourtClick={(court) => router.push(`/court/${court.id}`)}
                    />
                  </div>
                )
              ) : (
                <div className="text-center py-20 mb-12 glass rounded-3xl border-2 border-dashed border-clay-terracotta/30">
                  <div className="text-7xl mb-6 animate-float">🎾</div>
                  <p className="text-clay-rust-dark text-2xl font-display font-bold mb-3">No courts found</p>
                  <p className="text-clay-rust-dark/70 text-sm font-medium">Try adjusting your filters or search query.</p>
                </div>
              )}
            </>
          ) : (
            /* Featured Courts when no search/filter */
            <div className="mb-12">
              <FeaturedCourts />
            </div>
          )}
        </div>

        {/* Weekly Availability Section */}
        <div className="mt-12 relative z-0">
          <WeeklyAvailability />
        </div>
      </main>
    </div>
  )
}

