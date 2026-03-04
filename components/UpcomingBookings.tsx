'use client'

import Link from 'next/link'
import { Calendar, Clock, MapPin, ArrowRight } from '@/components/Icons'
import { format, parseISO } from 'date-fns'

export interface UpcomingBookingItem {
  id: string
  courtNumber: string
  bookingDate: string | null
  startTime: string
  isRecurring: boolean
  court: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  } | null
}

interface UpcomingBookingsProps {
  nextBookings: UpcomingBookingItem[]
}

export default function UpcomingBookings({ nextBookings }: UpcomingBookingsProps) {
  if (nextBookings.length === 0) {
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
        <div className="text-center py-8">
          <p className="text-stone mb-4">No upcoming bookings</p>
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="text-terracotta hover:text-terracotta-dark font-medium text-sm"
          >
            Find a court
          </Link>
        </div>
      </div>
    )
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
        {nextBookings.map((booking) => {
          const court = booking.court
          if (!court) return null
          const dateStr = booking.bookingDate
            ? format(parseISO(booking.bookingDate), 'MMM d, yyyy')
            : ''
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
                      <span className="font-medium text-ink">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
                      <Clock className="w-4 h-4 text-terracotta" />
                      <span className="font-medium text-ink">{booking.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-stone-soft/50 px-3 py-1.5 rounded-lg border border-stone-soft/80">
                      <MapPin className="w-4 h-4 text-terracotta" />
                      <span className="font-medium text-ink">{court.city}</span>
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
