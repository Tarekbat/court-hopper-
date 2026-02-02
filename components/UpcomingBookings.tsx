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
        const court = mockCourts.find((c: Court) => c.id === booking.courtId)
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
    <div className="bg-white border border-stone-soft rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display text-ink mb-0.5">Upcoming bookings</h2>
          <p className="text-sm text-stone">Your reserved courts</p>
        </div>
        <Link
          href="/bookings"
          className="text-terracotta hover:text-terracotta-dark text-sm font-medium flex items-center gap-2 transition-all group"
        >
          View all
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="space-y-4">
        {upcomingBookings.map(({ booking, court }) => {
          if (!court) return null
          return (
            <Link
              key={booking.id}
              href={`/court/${court.id}`}
              className="block p-5 border border-stone-soft rounded-xl hover:border-terracotta/40 transition-all bg-white hover:bg-beige group card-hover relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display text-ink mb-2 group-hover:text-terracotta transition-colors text-lg">
                    {court.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
                      <Calendar className="w-4 h-4 text-terracotta" />
                      <span className="font-medium text-ink">{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
                      <Clock className="w-4 h-4 text-terracotta" />
                      <span className="font-medium text-ink">{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
                      <MapPin className="w-4 h-4 text-terracotta" />
                      <span className="font-medium text-ink">{court.distance} mi</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white bg-terracotta px-3 py-2 rounded-lg">
                    {booking.courtNumber}
                  </div>
                  {booking.isRecurring && (
                    <div className="text-xs text-terracotta mt-2 font-medium bg-terracotta/10 px-2.5 py-1 rounded-lg border border-terracotta/25">
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



