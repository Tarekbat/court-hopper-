'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-client'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { MapPin, Calendar, Clock, ArrowLeft, X } from '@/components/Icons'
import Link from 'next/link'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { format, isPast, parseISO } from 'date-fns'

interface Booking {
  id: string
  courtId: string
  courtNumber: string
  bookingDate: string
  startTime: string
  endTime: string
  duration: number
  price: number
  status: string
  isRecurring: boolean
  recurringPattern?: string | any
  paymentStatus?: 'paid' | 'pending' | 'failed'
  court: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  }
}

type FilterType = 'all' | 'upcoming' | 'past'

/** GET /api/bookings returns { items, nextCursor, limit }; older clients may expect a raw array. */
function bookingsFromApiPayload(data: unknown): Booking[] {
  if (Array.isArray(data)) return data as Booking[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: Booking[] }).items
  }
  return []
}

export default function BookingsPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('upcoming')

  useEffect(() => {
    // Fetch all bookings immediately without waiting for auth check
    const fetchBookings = async () => {
      try {
        setLoading(true)
        // Fetch all confirmed bookings (not just upcoming)
        const response = await fetch('/api/bookings?status=confirmed', {
          credentials: 'include',
        })
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please sign in to view your bookings')
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch bookings')
        }
        const data = await response.json()
        setAllBookings(bookingsFromApiPayload(data))
      } catch (err) {
        setError('Failed to load bookings')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    // Check auth in parallel, but don't block on it
    const checkAuth = async () => {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
    }

    // Run both in parallel for faster initial load
    Promise.all([fetchBookings(), checkAuth()])

    // Listen for auth changes
    const supabase = createBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchBookings()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/bookings?status=confirmed', {
        credentials: 'include',
      })
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view your bookings')
          return
        }
        throw new Error('Failed to fetch bookings')
      }
      const data = await response.json()
      setAllBookings(bookingsFromApiPayload(data))
    } catch (err) {
      setError('Failed to load bookings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and categorize bookings
  const { upcomingBookings, pastBookings, filteredBookings } = useMemo(() => {
    const upcoming: Booking[] = []
    const past: Booking[] = []

    allBookings.forEach((booking: Booking) => {
      // bookingDate from API is full ISO; endTime is "HH:mm". Use date-only to build end datetime.
      const dateOnly = booking.bookingDate.split('T')[0]
      const endDateTimeStr = booking.endTime ? `${dateOnly}T${booking.endTime}` : null
      const bookingEndTime = endDateTimeStr ? parseISO(endDateTimeStr) : parseISO(booking.bookingDate)

      // Past = session has ended (end time is in the past)
      if (isPast(bookingEndTime)) {
        past.push(booking)
      } else {
        upcoming.push(booking)
      }
    })

    // Sort upcoming by date ascending, past by date descending
    upcoming.sort((a, b) => 
      new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
    )
    past.sort((a, b) => 
      new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
    )

    let filtered: Booking[] = []
    if (filter === 'upcoming') {
      filtered = upcoming
    } else if (filter === 'past') {
      filtered = past
    } else {
      filtered = [...upcoming, ...past]
    }

    return { upcomingBookings: upcoming, pastBookings: past, filteredBookings: filtered }
  }, [allBookings, filter])

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return
    }

    try {
      setCancellingId(bookingId)
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel booking')
      }

      // Refresh bookings list
      await fetchBookings()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const isRecurring = (booking: Booking) => {
    if (!booking.isRecurring || !booking.recurringPattern) return false
    try {
      const pattern = typeof booking.recurringPattern === 'string' 
        ? JSON.parse(booking.recurringPattern) 
        : booking.recurringPattern
      return pattern.frequency === 'weekly'
    } catch {
      return false
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />

        <main className="max-w-7xl mx-auto px-5 pt-24 pb-10 md:pt-28 md:pb-12">
          {loading ? (
            <LoadingSkeleton count={3} variant="card" />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={fetchBookings}
              backLink={
                <Link href="/" className="px-5 py-2.5 text-ink bg-white border border-stone-soft rounded-xl hover:bg-beige text-sm font-medium">
                  Back to home
                </Link>
              }
            />
          ) : allBookings.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-14 h-14 text-stone mx-auto" />}
              title="No bookings yet"
              description="You haven't made any court reservations yet."
              action={
                <Link
                  href="/#results-section"
                  className="btn-premium inline-block px-6 py-3 text-white rounded-xl font-semibold text-sm"
                >
                  Browse courts
                </Link>
              }
            />
          ) : (
            <>
              <div className="internal-page-header">
                <h1 className="internal-page-title">
                  My bookings
                </h1>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-stone-soft shadow-sm">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      filter === 'all'
                        ? 'bg-ink text-white'
                        : 'text-stone hover:bg-beige'
                    }`}
                  >
                    All ({allBookings.length})
                  </button>
                  <button
                    onClick={() => setFilter('upcoming')}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      filter === 'upcoming'
                        ? 'bg-ink text-white'
                        : 'text-stone hover:bg-beige'
                    }`}
                  >
                    Upcoming ({upcomingBookings.length})
                  </button>
                  <button
                    onClick={() => setFilter('past')}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      filter === 'past'
                        ? 'bg-ink text-white'
                        : 'text-stone hover:bg-beige'
                    }`}
                  >
                    Past ({pastBookings.length})
                  </button>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-12 text-center">
                  <div className="mb-5">
                    <Calendar className="w-14 h-14 text-stone mx-auto" />
                  </div>
                  <h3 className="text-lg font-display text-ink mb-2">
                    No {filter === 'upcoming' ? 'upcoming' : filter === 'past' ? 'past' : ''} bookings
                  </h3>
                  <p className="text-stone text-sm">
                    {filter === 'upcoming'
                      ? "You don't have any upcoming bookings."
                      : filter === 'past'
                      ? "You don't have any past bookings."
                      : "No bookings found."}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {(filter === 'all' || filter === 'upcoming') && upcomingBookings.length > 0 && (
                    <div>
                      <h3 className="text-base font-display text-ink mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-accent-green rounded-full"></span>
                        Upcoming ({upcomingBookings.length})
                      </h3>
                      <div className="space-y-4">
                        {upcomingBookings.map((booking, index) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            isPast={false}
                            isNext={index === 0}
                            isRecurring={isRecurring(booking)}
                            onCancel={handleCancelBooking}
                            cancellingId={cancellingId}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {(filter === 'all' || filter === 'past') && pastBookings.length > 0 && (
                    <div>
                      <h3 className="text-base font-display text-ink mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-stone rounded-full"></span>
                        Past ({pastBookings.length})
                      </h3>
                      <div className="space-y-4">
                        {pastBookings.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            isPast={true}
                            isNext={false}
                            isRecurring={isRecurring(booking)}
                            onCancel={handleCancelBooking}
                            cancellingId={cancellingId}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

// Booking Card Component
function BookingCard({
  booking,
  isPast,
  isNext,
  isRecurring,
  onCancel,
  cancellingId,
}: {
  booking: Booking
  isPast: boolean
  isNext?: boolean
  isRecurring: boolean
  onCancel: (id: string) => void
  cancellingId: string | null
}) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-6 transition-shadow hover:shadow-md ${
        isNext ? 'border-terracotta/40 ring-1 ring-terracotta/20' : 'border-stone-soft'
      } ${isPast ? 'opacity-90' : ''}`}
    >
      {isNext && (
        <div className="mb-3 px-3 py-1.5 bg-terracotta/10 text-terracotta rounded-lg text-xs font-semibold uppercase tracking-wide inline-block border border-terracotta/25">
          Next booking
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Link
              href={`/court/${booking.courtId}`}
              className="text-lg font-display text-ink hover:text-terracotta transition-colors"
            >
              {booking.court.name}
            </Link>
            {isRecurring && (
              <span className="px-2.5 py-1 bg-terracotta/10 text-terracotta rounded-lg text-xs font-medium border border-terracotta/25">
                Recurring
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                booking.status === 'confirmed'
                  ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                  : booking.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-stone-soft/80 text-stone border border-stone-soft'
              }`}
            >
              {booking.status}
            </span>
            {isPast && (
              <span className="px-2.5 py-1 bg-stone-soft/80 text-stone rounded-lg text-xs font-medium border border-stone-soft">
                Completed
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 mb-4">
            <MapPin className="w-4 h-4 text-stone mt-0.5 flex-shrink-0" />
            <span className="text-sm text-stone">
              {booking.court.address}, {booking.court.city}, {booking.court.state}{' '}
              {booking.court.zipCode}
            </span>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [booking.court.address, booking.court.city, booking.court.state, booking.court.zipCode].filter(Boolean).join(', ')
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-terracotta hover:text-terracotta-dark font-medium mb-4"
          >
            Get directions
            <span aria-hidden>↗</span>
          </a>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-stone-soft/50 rounded-xl border border-stone-soft/80">
            <div>
              <div className="text-xs text-stone mb-1">Court</div>
              <div className="font-medium text-ink">{booking.courtNumber}</div>
            </div>
            <div>
              <div className="text-xs text-stone mb-1">Date</div>
              <div className="font-medium text-ink">
                {format(new Date(booking.bookingDate), 'MMM d, yyyy')}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone mb-1">Time</div>
              <div className="font-medium text-ink">
                {booking.startTime} – {booking.endTime}
              </div>
            </div>
          </div>

          {isRecurring && booking.recurringPattern && (
            <div className="mb-4 p-3 bg-terracotta/5 rounded-xl border border-terracotta/20">
              <div className="text-sm text-ink">
                <span className="font-medium">Recurring:</span>{' '}
                {(() => {
                  try {
                    const pattern = typeof booking.recurringPattern === 'string'
                      ? JSON.parse(booking.recurringPattern)
                      : booking.recurringPattern
                    return `Every ${
                      pattern.frequency === 'weekly'
                        ? 'week'
                        : pattern.frequency === 'biweekly'
                        ? '2 weeks'
                        : 'month'
                    }${pattern.daysOfWeek ? ` on ${pattern.daysOfWeek.join(', ')}` : ''}`
                  } catch {
                    return 'Weekly'
                  }
                })()}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <div>
              <span className="text-stone">Duration:</span>{' '}
              <span className="font-medium text-ink">{booking.duration} hr</span>
            </div>
            <div>
              <span className="text-stone">Price:</span>{' '}
              <span className="font-medium text-ink">${booking.price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-stone">Payment:</span>{' '}
              <span
                className={`font-medium ${
                  booking.paymentStatus === 'paid' ? 'text-accent-green' : 'text-terracotta'
                }`}
              >
                {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>

          {booking.status === 'confirmed' && !isPast && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={cancellingId === booking.id}
              className="px-4 py-2 text-ink bg-white border border-stone-soft rounded-xl hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center gap-2"
              aria-label="Cancel booking"
            >
              {cancellingId === booking.id ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-stone border-t-transparent"></div>
                  <span>Cancelling…</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
