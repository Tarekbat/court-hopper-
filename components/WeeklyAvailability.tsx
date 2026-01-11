'use client'

import { useMemo } from 'react'
import { Court, TimeSlotAvailability } from '@/types'
import { mockCourts } from '@/data/mockCourts'
import { MapPin, Star, DollarSign } from '@/components/Icons'
import Link from 'next/link'

interface AvailableSlot {
  court: Court
  day: string
  timeSlot: TimeSlotAvailability
  availableCount: number
}

interface WeeklyAvailabilityProps {
  courts?: Court[]
}

export default function WeeklyAvailability({ courts = mockCourts }: WeeklyAvailabilityProps) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const availableSlots = useMemo(() => {
    const slots: AvailableSlot[] = []

    // Get all available slots from all courts
    courts.forEach((court) => {
      daysOfWeek.forEach((day) => {
        const daySlots = court.timeSlots[day] || []
        daySlots.forEach((timeSlot) => {
          const availableCount = timeSlot.availableCourts.filter((c) => c.isAvailable).length
          if (availableCount > 0) {
            slots.push({
              court,
              day,
              timeSlot,
              availableCount,
            })
          }
        })
      })
    })

    // Sort by distance, then by day, then by time
    slots.sort((a, b) => {
      if (a.court.distance !== b.court.distance) {
        return a.court.distance - b.court.distance
      }
      const dayOrder = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day)
      if (dayOrder !== 0) {
        return dayOrder
      }
      return a.timeSlot.time.localeCompare(b.timeSlot.time)
    })

    return slots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courts])

  const isPeakTime = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    const period = time.split(' ')[1]
    if (period === 'PM' && hour >= 5 && hour < 8) return true
    if (period === 'PM' && hour === 12) return true
    return false
  }

  const getPrice = (court: Court, time: string) => {
    return isPeakTime(time) ? court.price.peak : court.price.offPeak
  }

  const surfaceColors: Record<string, string> = {
    Hard: 'bg-blue-100 text-blue-800',
    Clay: 'bg-orange-100 text-orange-800',
    Grass: 'bg-green-100 text-green-800',
    'Artificial Grass': 'bg-emerald-100 text-emerald-800',
    Carpet: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Weekly Availability</h2>
        <p className="text-gray-600">All available time slots across all locations, sorted by distance</p>
      </div>

      {availableSlots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No available slots found.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {availableSlots.map((slot, index) => (
            <Link
              key={`${slot.court.id}-${slot.day}-${slot.timeSlot.time}-${index}`}
              href={`/court/${slot.court.id}`}
            >
              <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{slot.court.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${surfaceColors[slot.court.surface] || 'bg-gray-100 text-gray-800'}`}>
                        {slot.court.surface}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{slot.court.distance} mi</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{slot.court.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${getPrice(slot.court, slot.timeSlot.time)}/hr</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Day:</span>
                        <span className="text-gray-600">{slot.day}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Time:</span>
                        <span className="text-gray-600 font-semibold">{slot.timeSlot.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Available:</span>
                        <span className="text-primary-600 font-semibold">
                          {slot.availableCount} {slot.availableCount === 1 ? 'court' : 'courts'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {slot.court.location.address}, {slot.court.location.city}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}



