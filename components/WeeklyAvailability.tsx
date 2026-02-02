'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Court } from '@/types'
import { MapPin, Star, DollarSign, Calendar } from '@/components/Icons'
import Link from 'next/link'

interface DayAvailability {
  day: string
  date: string
  locations: {
    court: Court
    availableCourts: number
  }[]
}

interface WeeklyAvailabilityProps {
  courts?: Court[]
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Helper to get date for a day of week in current week
const getDateForDay = (dayName: string): Date => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayIndex = days.indexOf(dayName)
  if (dayIndex === -1) return new Date()
  
  const today = new Date()
  const currentDay = today.getDay()
  const diff = dayIndex - currentDay
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + diff)
  return targetDate
}

export default function WeeklyAvailability({ courts: propCourts }: WeeklyAvailabilityProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAllCourts, setShowAllCourts] = useState<Set<string>>(new Set())
  const [courts, setCourts] = useState<Court[]>(propCourts || [])
  const [loading, setLoading] = useState(!propCourts)

  // Fetch courts if not provided
  useEffect(() => {
    if (propCourts && propCourts.length > 0) {
      setCourts(propCourts)
      return
    }

    const fetchCourts = async () => {
      try {
        setLoading(true)
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
      } finally {
        setLoading(false)
      }
    }

    fetchCourts()
  }, [propCourts])

  // Get current week's dates
  const getCurrentWeekDates = useCallback(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Get Monday of current week
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const weekDates: { day: string; date: Date }[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDates.push({
        day: daysOfWeek[i],
        date: date,
      })
    }
    return weekDates
  }, [])

  // Fetch availability for each court for each day
  const [availabilityData, setAvailabilityData] = useState<Map<string, Map<string, number>>>(new Map())
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  useEffect(() => {
    if (courts.length === 0) return

    const fetchAvailability = async () => {
      setLoadingAvailability(true)
      const weekDates = getCurrentWeekDates()
      
      // Get all unique dates for the week
      const dates = weekDates.map(({ date }) => date.toISOString().split('T')[0])
      
      // Get all courts that are available on at least one day
      const availableCourts = courts.filter((court: Court) => 
        weekDates.some(({ day }) => court.availableDays.includes(day))
      )
      
      if (availableCourts.length === 0) {
        setLoadingAvailability(false)
        return
      }

      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        // Single batch request for all courts and all dates
        const courtIds = availableCourts.map((c: Court) => c.id).join(',')
        const datesStr = dates.join(',')
        const response = await fetch(`/api/courts/availability?courtIds=${courtIds}&dates=${datesStr}`, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const batchData = await response.json()
          const availabilityMap = new Map<string, Map<string, number>>()
          
          // Transform batch response into our map structure
          availableCourts.forEach((court: Court) => {
            const courtData = batchData[court.id]
            if (courtData) {
              const courtAvailability = new Map<string, number>()
              
              weekDates.forEach(({ day, date }) => {
                if (!court.availableDays.includes(day)) return
                
                const dateStr = date.toISOString().split('T')[0]
                const maxAvailable = courtData[dateStr]
                if (maxAvailable !== undefined) {
                  courtAvailability.set(day, maxAvailable)
                }
              })
              
              if (courtAvailability.size > 0) {
                availabilityMap.set(court.id, courtAvailability)
              }
            }
          })
          
          setAvailabilityData(availabilityMap)
        } else {
          console.error('Failed to fetch availability:', response.statusText)
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('Availability fetch timed out')
        } else {
          console.error('Error fetching batch availability:', error)
        }
      } finally {
        setLoadingAvailability(false)
      }
    }

    fetchAvailability()
  }, [courts, getCurrentWeekDates])

  const weekAvailability = useMemo(() => {
    const weekDates = getCurrentWeekDates()
    const availabilityByDay: DayAvailability[] = []

    weekDates.forEach(({ day, date }) => {
      const dayLocations: { court: Court; availableCourts: number }[] = []

      courts.forEach((court) => {
        if (!court.availableDays.includes(day)) {
          return
        }

        const courtAvail = availabilityData.get(court.id)
        const availableCount = courtAvail?.get(day) || 0

        if (availableCount > 0) {
          dayLocations.push({
            court,
            availableCourts: availableCount,
          })
        }
      })

      // Sort by distance
      dayLocations.sort((a, b) => a.court.distance - b.court.distance)

      if (dayLocations.length > 0) {
        availabilityByDay.push({
          day,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          locations: dayLocations,
        })
      }
    })

    return availabilityByDay
  }, [courts, availabilityData, getCurrentWeekDates])

  // Set initial selected day to first available day
  useEffect(() => {
    if (weekAvailability.length > 0 && !selectedDay) {
      setSelectedDay(weekAvailability[0].day)
    }
  }, [weekAvailability, selectedDay])

  const surfaceColors: Record<string, string> = {
    Hard: 'bg-clay-terracotta/20 text-clay-rust-dark border border-clay-terracotta/30',
    Clay: 'bg-clay-terracotta/30 text-clay-rust-dark border border-clay-terracotta/50',
    Grass: 'bg-tropical-sage/20 text-tropical-palm border border-tropical-sage/30',
    'Artificial Grass': 'bg-tropical-jade/20 text-tropical-palm border border-tropical-jade/30',
    Carpet: 'bg-clay-sand/20 text-clay-rust-dark border border-clay-sand/30',
  }

  const toggleShowAll = (day: string) => {
    const newSet = new Set(showAllCourts)
    if (newSet.has(day)) {
      newSet.delete(day)
    } else {
      newSet.add(day)
    }
    setShowAllCourts(newSet)
  }

  // Only show loading if we have no data at all
  // If we have some data, show it even if still loading more
  if (loading || (loadingAvailability && availabilityData.size === 0 && weekAvailability.length === 0)) {
    return (
      <div className="bg-white rounded-3xl shadow-luxury p-6 border-2 border-clay-terracotta/20">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-terracotta mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading availability...</p>
        </div>
      </div>
    )
  }

  const selectedDayData = weekAvailability.find((d: DayAvailability) => d.day === selectedDay)
  const MAX_INITIAL_COURTS = 5

  return (
    <div className="bg-white rounded-3xl shadow-luxury p-6 border-2 border-clay-terracotta/20">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">This Week&apos;s Availability</h2>
            <p className="text-gray-700">Available courts by day, sorted by distance</p>
          </div>
          {loadingAvailability && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-clay-terracotta"></div>
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Day Navigation Tabs - Horizontal Scroll */}
      {weekAvailability.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {weekAvailability.map((dayData) => {
              const isSelected = selectedDay === dayData.day
              return (
                <button
                  key={dayData.day}
                  onClick={() => setSelectedDay(dayData.day)}
                  className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all min-w-[85px] ${
                    isSelected
                      ? 'bg-clay-gradient text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xs opacity-80">{dayData.date.split(' ')[0]}</span>
                  <span className="font-bold">{dayData.day.slice(0, 3)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/30' : 'bg-gray-200'
                  }`}>
                    {dayData.locations.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {weekAvailability.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No available courts found this week.</p>
        </div>
      ) : selectedDayData ? (
        <div className="space-y-3">
          {/* Selected Day Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-clay-terracotta" />
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">{selectedDayData.day}</h3>
                <p className="text-sm text-gray-600">{selectedDayData.date}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-clay-terracotta/10 text-clay-rust-dark rounded-lg text-sm font-bold border border-clay-terracotta/30">
              {selectedDayData.locations.length} {selectedDayData.locations.length === 1 ? 'location' : 'locations'}
            </span>
          </div>

          {/* Compact Court Cards */}
          <div className="space-y-2">
            {(showAllCourts.has(selectedDayData.day) 
              ? selectedDayData.locations 
              : selectedDayData.locations.slice(0, MAX_INITIAL_COURTS)
            ).map((location) => (
              <Link
                key={`${selectedDayData.day}-${location.court.id}`}
                href={`/court/${location.court.id}`}
              >
                <div className="border border-gray-200 rounded-lg p-3 hover:border-clay-terracotta/50 hover:shadow-sm transition-all cursor-pointer bg-white hover:bg-gray-50/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-base font-display font-bold text-gray-900 truncate">{location.court.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${surfaceColors[location.court.surface] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                          {location.court.surface}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-clay-terracotta" />
                          <span className="font-semibold">{location.court.distance} mi</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-clay-terracotta text-clay-terracotta" />
                          <span className="font-semibold">{location.court.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-tropical-palm" />
                          <span className="font-semibold">${location.court.price.offPeak}-${location.court.price.peak}/hr</span>
                        </div>
                        <span className="text-gray-500">
                          {location.court.location.city}, {location.court.location.state}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 bg-clay-terracotta/10 px-2.5 py-1 rounded border border-clay-terracotta/30">
                      <span className="font-bold text-clay-rust-dark text-xs">
                        {location.availableCourts} {location.availableCourts === 1 ? 'court' : 'courts'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View All / Show Less Toggle */}
          {selectedDayData.locations.length > MAX_INITIAL_COURTS && (
            <button
              onClick={() => toggleShowAll(selectedDayData.day)}
              className="w-full py-2.5 text-sm font-semibold text-clay-terracotta hover:bg-clay-terracotta/10 rounded-lg transition-colors border border-clay-terracotta/30"
            >
              {showAllCourts.has(selectedDayData.day) 
                ? `Show Less (${MAX_INITIAL_COURTS} of ${selectedDayData.locations.length})`
                : `View All ${selectedDayData.locations.length} Locations`
              }
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
