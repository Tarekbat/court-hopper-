'use client'

import { useMemo, useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { mockBookings } from '@/data/mockBookings'
import { mockCourts } from '@/data/mockCourts'
import { Booking, Court } from '@/types'
import Link from 'next/link'
import { Calendar, Clock, MapPin, ArrowRight } from '@/components/Icons'
import { createBrowserClient } from '@/lib/supabase-client'

const MOCK_USER_ID = 'user123'

export default function UpcomingBookings() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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

  // Don't show if user is not authenticated
  if (loading) {
    return null
  }

  if (!session) {
    return null
  }

  if (upcomingBookings.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-3xl shadow-luxury p-8 md:p-10 border-2 border-miami-turquoise/20 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-1">Upcoming Bookings</h2>
          <p className="text-sm text-gray-700 font-medium">Your reserved courts</p>
        </div>
        <Link
          href="/bookings"
          className="text-miami-turquoise hover:text-miami-ocean text-sm font-bold flex items-center gap-2 transition-all group"
        >
          View All
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      <div className="space-y-4">
        {upcomingBookings.map(({ booking, court }) => {
          if (!court) return null
          return (
            <Link
              key={booking.id}
              href={`/court/${court.id}`}
              className="block p-6 border-2 border-gray-200 rounded-2xl hover:border-miami-turquoise/50 hover:shadow-md transition-all bg-gray-50 hover:bg-white group card-hover relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-miami-turquoise to-miami-pink opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-gray-900 mb-3 group-hover:text-miami-turquoise transition-colors text-xl">
                    {court.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                      <Calendar className="w-4 h-4 text-miami-turquoise" />
                      <span className="font-semibold text-gray-800">{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                      <Clock className="w-4 h-4 text-miami-turquoise" />
                      <span className="font-semibold text-gray-800">{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                      <MapPin className="w-4 h-4 text-miami-turquoise" />
                      <span className="font-semibold text-gray-800">{court.distance} mi</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white bg-gradient-to-br from-miami-turquoise to-miami-ocean px-4 py-2 rounded-xl shadow-md">
                    {booking.courtNumber}
                  </div>
                  {booking.isRecurring && (
                    <div className="text-xs text-miami-pink mt-2 font-bold bg-miami-pink/20 px-3 py-1 rounded-lg border border-miami-pink/30">
                      Recurring
                    </div>
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



