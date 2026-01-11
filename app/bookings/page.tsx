'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { MapPin, Calendar, Clock, ArrowLeft, X } from '@/components/Icons'
import Link from 'next/link'
import { format } from 'date-fns'

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
  recurringPattern?: string
  court: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  }
}

export default function BookingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      fetchBookings()
    }
  }, [session])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bookings?status=confirmed&upcoming=true')
      if (!response.ok) throw new Error('Failed to fetch bookings')
      const data = await response.json()
      setBookings(data)
    } catch (err) {
      setError('Failed to load bookings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel booking')
      }

      // Refresh bookings list
      fetchBookings()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking')
    }
  }

  const isRecurring = (booking: Booking) => {
    if (!booking.isRecurring || !booking.recurringPattern) return false
    try {
      const pattern = JSON.parse(booking.recurringPattern)
      return pattern.frequency === 'weekly'
    } catch {
      return false
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800">{error}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="mb-4">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Bookings Yet</h2>
              <p className="text-gray-600 mb-6">You haven't made any court reservations yet.</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Browse Available Courts
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
                </h2>
              </div>

              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Link
                            href={`/court/${booking.courtId}`}
                            className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                          >
                            {booking.court.name}
                          </Link>
                          {isRecurring(booking) && (
                            <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-semibold">
                              Recurring
                            </span>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <span className="text-sm">
                              {booking.court.address}, {booking.court.city}, {booking.court.state}{' '}
                              {booking.court.zipCode}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Court</div>
                            <div className="font-semibold text-gray-900">{booking.courtNumber}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Date</div>
                            <div className="font-semibold text-gray-900">
                              {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Time</div>
                            <div className="font-semibold text-gray-900">
                              {booking.startTime} - {booking.endTime}
                            </div>
                          </div>
                        </div>

                        {isRecurring(booking) && booking.recurringPattern && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm text-blue-800">
                              <span className="font-semibold">Recurring:</span>{' '}
                              {(() => {
                                try {
                                  const pattern = JSON.parse(booking.recurringPattern)
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

                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Duration:</span>{' '}
                            <span className="font-semibold text-gray-900">{booking.duration} hour</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>{' '}
                            <span className="font-semibold text-gray-900">${booking.price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment:</span>{' '}
                            <span
                              className={`font-semibold ${
                                booking.status === 'paid' ? 'text-green-600' : 'text-orange-600'
                              }`}
                            >
                              {booking.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Cancel booking"
                          title="Cancel booking"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
