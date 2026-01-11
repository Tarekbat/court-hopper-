'use client'

import { useMemo, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import { mockBookings } from '@/data/mockBookings'
import { mockCourts } from '@/data/mockCourts'
import { Booking, Court } from '@/types'
import Link from 'next/link'
import { Calendar, Clock, MapPin, ArrowRight } from '@/components/Icons'

const MOCK_USER_ID = 'user123'

export default function UpcomingBookings() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const supabase = createBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
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
    <div className="glass rounded-3xl shadow-luxury p-8 md:p-10 border border-clay-terracotta/20 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-clay-rust-dark mb-1">Upcoming Bookings</h2>
          <p className="text-sm text-clay-rust-dark/70 font-medium">Your reserved courts</p>
        </div>
        <Link
          href="/bookings"
          className="text-clay-terracotta hover:text-clay-orange text-sm font-bold flex items-center gap-2 transition-all group"
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
              className="block p-6 border-2 border-clay-terracotta/20 rounded-2xl hover:border-clay-terracotta/50 hover:shadow-luxury transition-all bg-clay-cream/50 hover:bg-white group card-hover relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-clay opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-clay-rust-dark mb-3 group-hover:text-clay-terracotta transition-colors text-xl">
                    {court.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-clay-terracotta/20 shadow-soft">
                      <Calendar className="w-4 h-4 text-clay-terracotta" />
                      <span className="font-semibold text-clay-rust-dark">{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-clay-terracotta/20 shadow-soft">
                      <Clock className="w-4 h-4 text-clay-terracotta" />
                      <span className="font-semibold text-clay-rust-dark">{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-clay-terracotta/20 shadow-soft">
                      <MapPin className="w-4 h-4 text-clay-terracotta" />
                      <span className="font-semibold text-clay-rust-dark">{court.distance} mi</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white bg-gradient-clay px-4 py-2 rounded-xl shadow-md">
                    {booking.courtNumber}
                  </div>
                  {booking.isRecurring && (
                    <div className="text-xs text-clay-terracotta mt-2 font-bold bg-clay-terracotta/20 px-3 py-1 rounded-lg border border-clay-terracotta/30">
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
