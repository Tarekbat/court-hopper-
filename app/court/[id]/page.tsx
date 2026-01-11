'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { mockCourts } from '@/data/mockCourts'
import { Court } from '@/types'
import WeeklyView from '@/components/WeeklyView'
import {
  MapPin,
  Star,
  DollarSign,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle,
  X,
} from '@/components/Icons'

export default function CourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const court = mockCourts.find((c) => c.id === params.id) as Court | undefined

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [showWeeklyView, setShowWeeklyView] = useState(false)

  if (!court) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Court not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Go back to home
          </button>
        </div>
      </div>
    )
  }

  const surfaceColors: Record<string, string> = {
    Hard: 'bg-blue-100 text-blue-800',
    Clay: 'bg-orange-100 text-orange-800',
    Grass: 'bg-green-100 text-green-800',
    'Artificial Grass': 'bg-emerald-100 text-emerald-800',
    Carpet: 'bg-purple-100 text-purple-800',
  }

  const getAvailableTimeSlots = () => {
    if (!selectedDate) return []
    return court.timeSlots[selectedDate] || []
  }

  const getAvailableCourtsForTime = () => {
    if (!selectedDate || !selectedTime) return []
    const timeSlot = getAvailableTimeSlots().find(ts => ts.time === selectedTime)
    if (!timeSlot) return []
    return timeSlot.availableCourts.filter(c => c.isAvailable)
  }

  const handleBooking = () => {
    if (selectedDate && selectedTime && selectedCourt) {
      setShowBookingModal(true)
    }
  }

  const confirmBooking = () => {
    setBookingConfirmed(true)
    setTimeout(() => {
      setShowBookingModal(false)
      setBookingConfirmed(false)
      setSelectedDate('')
      setSelectedTime('')
      setSelectedCourt('')
    }, 2000)
  }

  const isPeakTime = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    const period = time.split(' ')[1]
    if (period === 'PM' && hour >= 5 && hour < 8) return true
    if (period === 'PM' && hour === 12) return true
    return false
  }

  const getPrice = (time: string) => {
    return isPeakTime(time) ? court.price.peak : court.price.offPeak
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Courts</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Court Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Court Image */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="h-96 bg-gradient-to-br from-primary-400 to-primary-600 relative">
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${surfaceColors[court.surface] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {court.surface}
                  </span>
                </div>
              </div>
            </div>

            {/* Court Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{court.name}</h1>

              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">
                    {court.location.address}, {court.location.city}, {court.location.state} {court.location.zipCode}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-700 font-medium">{court.distance} miles away</span>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-xl font-bold text-gray-900">{court.rating}</span>
                  <span className="text-gray-500">({court.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">
                    ${court.price.offPeak} - ${court.price.peak}/hr
                  </span>
                </div>
              </div>

              <p className="text-gray-700 mb-6 leading-relaxed">{court.description}</p>

              {/* Court Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Court Information</h3>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-primary-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Courts</p>
                    <p className="text-2xl font-bold text-primary-600">{court.totalCourts}</p>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Surface Type</p>
                    <p className="text-lg font-semibold text-gray-900">{court.surface}</p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {court.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly View Toggle */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
                <button
                  onClick={() => setShowWeeklyView(!showWeeklyView)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  {showWeeklyView ? 'Hide' : 'Show'} Weekly View
                </button>
              </div>
              {showWeeklyView && <WeeklyView court={court} />}
            </div>
          </div>

          {/* Right Column - Booking */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Court</h2>

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Select Day
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {court.availableDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDate(day)
                        setSelectedTime('')
                        setSelectedCourt('')
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDate === day
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Select Time
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {getAvailableTimeSlots().map((timeSlot) => {
                      const availableCount = timeSlot.availableCourts.filter(c => c.isAvailable).length
                      const hasAvailability = availableCount > 0
                      return (
                        <button
                          key={timeSlot.time}
                          onClick={() => {
                            setSelectedTime(timeSlot.time)
                            setSelectedCourt('')
                          }}
                          disabled={!hasAvailability}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                            selectedTime === timeSlot.time
                              ? 'bg-primary-600 text-white'
                              : hasAvailability
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {timeSlot.time}
                          {hasAvailability && (
                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {availableCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Court Selection */}
              {selectedTime && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Specific Court
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {getAvailableCourtsForTime().map((courtOption) => (
                      <button
                        key={courtOption.number}
                        onClick={() => setSelectedCourt(courtOption.number)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCourt === courtOption.number
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {courtOption.number}
                      </button>
                    ))}
                  </div>
                  {getAvailableCourtsForTime().length === 0 && (
                    <p className="text-sm text-red-500 mt-2">No courts available at this time</p>
                  )}
                </div>
              )}

              {/* Price Display */}
              {selectedTime && (
                <div className="mb-6 p-4 bg-primary-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Price per hour</span>
                    <span className="text-lg font-bold text-primary-600">
                      ${getPrice(selectedTime)}
                    </span>
                  </div>
                  {isPeakTime(selectedTime) && (
                    <p className="text-xs text-gray-500">Peak hours pricing</p>
                  )}
                </div>
              )}

              {/* Recurring Booking Option */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Make this a recurring booking</span>
                </label>
                {isRecurring && (
                  <div className="mt-3 ml-6">
                    <label className="block text-xs text-gray-600 mb-2">Frequency</label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={!selectedDate || !selectedTime || !selectedCourt}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            {!bookingConfirmed ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">Confirm Booking</h3>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Court</p>
                    <p className="font-semibold text-gray-900">{court.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDate}, {selectedTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Court</p>
                    <p className="font-semibold text-gray-900">{selectedCourt}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-semibold text-gray-900">1 hour</p>
                  </div>
                  {isRecurring && (
                    <div>
                      <p className="text-sm text-gray-600">Recurring</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {recurringFrequency === 'biweekly' ? 'Bi-weekly' : recurringFrequency}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Total Price</p>
                    <p className="text-2xl font-bold text-primary-600">
                      ${getPrice(selectedTime)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={confirmBooking}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Confirm Booking
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                <p className="text-gray-600">
                  Your court reservation has been confirmed. Check your email for details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

