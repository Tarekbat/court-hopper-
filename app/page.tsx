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
      
      // If database is empty or returns no results, use mock data as fallback
      if (!data || data.length === 0) {
        const { mockCourts } = await import('@/data/mockCourts')
        setCourts(mockCourts)
        return
      }
      
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
            lat: court.latitude || court.location?.coordinates?.lat || null,
            lng: court.longitude || court.location?.coordinates?.lng || null,
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
      // Fallback to mock data if API fails
      const { mockCourts } = await import('@/data/mockCourts')
      setCourts(mockCourts)
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
    <div className="min-h-screen bg-gradient-to-b from-miami-sand-light via-white to-miami-sand-light">
      <Header />

      {/* Hero Section - Miami South Beach Aesthetic */}
      <section className="bg-hero-gradient text-white py-24 md:py-32 relative z-10 overflow-hidden">
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
        
        {/* Art Deco geometric pattern */}
        <div className="absolute inset-0 art-deco-pattern opacity-10"></div>
        
        {/* Miami beach wave pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-miami-ocean/40 to-transparent"></div>
        
        {/* Accent lines - Miami colors */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-miami-turquoise via-miami-pink via-miami-coral to-miami-turquoise"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-miami-turquoise via-miami-pink via-miami-coral to-miami-turquoise"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center justify-center mb-6 px-5 py-2.5 bg-black/40 backdrop-blur-xl rounded-full border-2 border-white/60 shadow-2xl">
              <span className="text-white text-xs font-bold tracking-[0.3em] uppercase" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>✨ ELITE EXPERIENCE ✨</span>
            </div>
            
            {/* Main heading - Clean and centered */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold mb-6 leading-tight">
              <span className="block text-white drop-shadow-2xl" style={{ textShadow: '0 6px 30px rgba(0,0,0,0.9), 0 3px 12px rgba(0,0,0,0.7)' }}>Reserve Your</span>
              <span className="block text-miami-turquoise-light mt-2 drop-shadow-2xl" style={{ textShadow: '0 6px 30px rgba(0,0,0,0.9), 0 3px 12px rgba(0,0,0,0.7)' }}>Perfect Court</span>
            </h1>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-white max-w-2xl mx-auto font-semibold leading-relaxed drop-shadow-lg" style={{ textShadow: '0 3px 15px rgba(0,0,0,0.8), 0 1px 6px rgba(0,0,0,0.6)' }}>
              Exclusive access to premium tennis facilities. Experience luxury, precision, and excellence.
            </p>
          </div>
          
          {/* Search Bar in Hero - Centered */}
          <div className="max-w-3xl mx-auto mb-10 animate-slide-up">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* Quick Actions */}
          <div className="max-w-5xl mx-auto animate-slide-up">
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
              className="px-6 py-3 bg-white border-2 border-miami-turquoise/40 rounded-2xl hover:border-miami-pink transition-all text-sm font-bold text-gray-900 shadow-md hover:shadow-lg"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            {showAvailableNow && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-miami-coral/20 border-2 border-miami-coral/40 rounded-2xl">
                <span className="text-sm font-bold text-miami-coral">Available Today</span>
                <button
                  onClick={() => setShowAvailableNow(false)}
                  className="text-miami-coral hover:text-miami-coral-dark font-bold text-lg leading-none"
                  aria-label="Remove available now filter"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {filteredCourts.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-md border-2 border-miami-turquoise/30">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-br from-miami-turquoise to-miami-ocean text-white shadow-md'
                    : 'text-gray-700 border-2 border-gray-200 hover:border-miami-turquoise/50 hover:bg-miami-turquoise/5'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2.5 rounded-xl transition-all ${
                  viewMode === 'map'
                    ? 'bg-gradient-to-br from-miami-turquoise to-miami-ocean text-white shadow-md'
                    : 'text-gray-700 border-2 border-gray-200 hover:border-miami-turquoise/50 hover:bg-miami-turquoise/5'
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
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-miami-turquoise border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-900 font-medium">Loading courts...</p>
            </div>
          ) : searchQuery || showFilters ? (
            <>
              {/* Results Header */}
              <div className="mb-10">
                <h2 className="text-4xl font-display font-bold text-gray-900 mb-2">
                  {filteredCourts.length} {filteredCourts.length === 1 ? 'Court' : 'Courts'} Found
                </h2>
                <p className="text-gray-700 font-medium">Premium facilities available</p>
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
                  <p className="text-gray-900 text-2xl font-display font-bold mb-3">No courts found</p>
                  <p className="text-gray-700 text-sm font-medium">Try adjusting your filters or search query.</p>
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

