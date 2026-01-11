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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Your Perfect Court</h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Book tennis courts near you with ease. Search, filter, and reserve in minutes.
            </p>
          </div>
          
          {/* Search Bar in Hero */}
          <div className="max-w-2xl mx-auto mb-6">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* Quick Actions */}
          <div className="max-w-4xl mx-auto">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        {/* Upcoming Bookings Section */}
        <div className="mb-12">
          <UpcomingBookings />
        </div>

        {/* Filters Toggle */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            {showAvailableNow && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-300 rounded-lg">
                <span className="text-sm font-medium text-orange-800">Available Today</span>
                <button
                  onClick={() => setShowAvailableNow(false)}
                  className="text-orange-600 hover:text-orange-800"
                  aria-label="Remove available now filter"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {filteredCourts.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading courts...</p>
            </div>
          ) : searchQuery || showFilters ? (
            <>
              {/* Results Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {filteredCourts.length} {filteredCourts.length === 1 ? 'Court' : 'Courts'} Found
                </h2>
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
                <div className="text-center py-12 mb-12">
                  <p className="text-gray-500 text-lg">No courts found matching your criteria.</p>
                  <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search query.</p>
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

