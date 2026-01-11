'use client'

import { useMemo, useState } from 'react'
import { Court } from '@/types'
import { mockCourts } from '@/data/mockCourts'
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

export default function WeeklyAvailability({ courts = mockCourts }: WeeklyAvailabilityProps) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(daysOfWeek))

  // Get current week's dates
  const getCurrentWeekDates = () => {
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
  }

  const weekAvailability = useMemo(() => {
    const weekDates = getCurrentWeekDates()
    const availabilityByDay: DayAvailability[] = []

    weekDates.forEach(({ day, date }) => {
      const dayLocations = new Map<string, { court: Court; availableCourts: number }>()

      courts.forEach((court) => {
        const daySlots = court.timeSlots[day] || []
        let maxAvailableCourts = 0

        // Find the maximum number of available courts across all time slots for this day
        daySlots.forEach((timeSlot) => {
          const availableCount = timeSlot.availableCourts.filter((c) => c.isAvailable).length
          if (availableCount > maxAvailableCourts) {
            maxAvailableCourts = availableCount
          }
        })

        if (maxAvailableCourts > 0) {
          dayLocations.set(court.id, {
            court,
            availableCourts: maxAvailableCourts,
          })
        }
      })

      // Convert to array and sort by distance
      const locations = Array.from(dayLocations.values())
      locations.sort((a, b) => a.court.distance - b.court.distance)

      if (locations.length > 0) {
        availabilityByDay.push({
          day,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          locations,
        })
      }
    })

    return availabilityByDay
  }, [courts])

  const surfaceColors: Record<string, string> = {
    Hard: 'bg-miami-turquoise/20 text-miami-turquoise-dark border border-miami-turquoise/30',
    Clay: 'bg-miami-coral/20 text-miami-coral-dark border border-miami-coral/30',
    Grass: 'bg-green-100 text-green-800 border border-green-200',
    'Artificial Grass': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Carpet: 'bg-purple-100 text-purple-800 border border-purple-200',
  }

  const toggleDay = (day: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(day)) {
      newExpanded.delete(day)
    } else {
      newExpanded.add(day)
    }
    setExpandedDays(newExpanded)
  }

  const scrollToDay = (day: string) => {
    setSelectedDay(day)
    const element = document.getElementById(`day-${day}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Expand if collapsed
      if (!expandedDays.has(day)) {
        toggleDay(day)
      }
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-luxury p-8 border-2 border-miami-turquoise/20">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">This Week's Availability</h2>
        <p className="text-gray-700">Available courts by day, sorted by distance</p>
      </div>

      {/* Day Navigation Tabs */}
      {weekAvailability.length > 0 && (
        <div className="mb-6 sticky top-0 z-10 bg-white pb-4 border-b-2 border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {weekAvailability.map((dayData) => (
              <button
                key={dayData.day}
                onClick={() => scrollToDay(dayData.day)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all min-w-[80px] ${
                  selectedDay === dayData.day
                    ? 'bg-gradient-to-br from-miami-turquoise to-miami-ocean text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs opacity-80">{dayData.date.split(' ')[0]}</span>
                <span>{dayData.day.slice(0, 3)}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {dayData.locations.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {weekAvailability.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No available courts found this week.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {weekAvailability.map((dayData) => (
            <div 
              key={dayData.day} 
              id={`day-${dayData.day}`}
              className="border-2 border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white overflow-hidden"
            >
              {/* Day Header - Clickable to expand/collapse */}
              <button
                onClick={() => toggleDay(dayData.day)}
                className="w-full flex items-center gap-3 p-6 hover:bg-gray-100/50 transition-colors"
              >
                <Calendar className="w-5 h-5 text-miami-turquoise" />
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-display font-bold text-gray-900">{dayData.day}</h3>
                  <p className="text-sm text-gray-600">{dayData.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-miami-turquoise/10 text-miami-turquoise-dark rounded-lg text-sm font-bold border border-miami-turquoise/30">
                    {dayData.locations.length} {dayData.locations.length === 1 ? 'location' : 'locations'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${expandedDays.has(dayData.day) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Locations for this day - Collapsible */}
              {expandedDays.has(dayData.day) && (
                <div className="px-6 pb-6 space-y-3">
                  {dayData.locations.map((location) => (
                    <Link
                      key={`${dayData.day}-${location.court.id}`}
                      href={`/court/${location.court.id}`}
                    >
                      <div className="border border-gray-200 rounded-xl p-4 hover:border-miami-turquoise/50 hover:shadow-md transition-all cursor-pointer bg-white hover:bg-gray-50/50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-display font-bold text-gray-900">{location.court.name}</h4>
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${surfaceColors[location.court.surface] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                {location.court.surface}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-5 mb-2 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <MapPin className="w-4 h-4 text-miami-turquoise" />
                                <span className="font-semibold">{location.court.distance} mi</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Star className="w-4 h-4 fill-miami-turquoise text-miami-turquoise" />
                                <span className="font-semibold">{location.court.rating}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <DollarSign className="w-4 h-4 text-miami-pink" />
                                <span className="font-semibold">${location.court.price.offPeak}-${location.court.price.peak}/hr</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-miami-turquoise/10 px-3 py-1.5 rounded-lg border border-miami-turquoise/30">
                                <span className="font-bold text-miami-turquoise-dark text-sm">
                                  {location.availableCourts} {location.availableCourts === 1 ? 'court' : 'courts'} available
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {location.court.location.city}, {location.court.location.state}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



