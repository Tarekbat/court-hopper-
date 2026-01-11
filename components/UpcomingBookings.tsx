'use client'

import { useMemo } from 'react'
import { mockBookings } from '@/data/mockBookings'
import { mockCourts } from '@/data/mockCourts'
import { Booking, Court } from '@/types'
import Link from 'next/link'
import { Calendar, Clock, MapPin, ArrowRight } from '@/components/Icons'

const MOCK_USER_ID = 'user123'

export default function UpcomingBookings() {
  const upcomingBookings = useMemo(() => {
    const userBookings = mockBookings
      .filter((booking) => booking.userId === MOCK_USER_ID || (!booking.userId && parseInt(booking.id.replace('b', '')) <= 5))
      .slice(0, 3)
      .map((booking) => {
        const court = mockCourts.find((c) => c.id === booking.courtId)
        return { booking, court: court as Court | undefined }
      })
      .filter((item) => item.court)

    return userBookings
  }, [])

  if (upcomingBookings.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Upcoming Bookings</h2>
        <Link
          href="/bookings"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {upcomingBookings.map(({ booking, court }) => {
          if (!court) return null
          return (
            <Link
              key={booking.id}
              href={`/court/${court.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{court.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{court.distance} mi</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{booking.courtNumber}</div>
                  {booking.isRecurring && (
                    <div className="text-xs text-primary-600 mt-1">Recurring</div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}



