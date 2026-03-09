'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Court, TimeSlotAvailability, IndividualCourt } from '@/types'
import WeeklyView from '@/components/WeeklyView'
import { format, addDays, startOfToday, isToday, isTomorrow, isSameDay, parseISO } from 'date-fns'
import { createBrowserClient } from '@/lib/supabase-client'
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

// Helper to convert 12h time to 24h format
const convertTo24Hour = (time12h: string): string => {
  const [time, period] = time12h.split(' ')
  const [hours, minutes] = time.split(':')
  let hour24 = parseInt(hours)
  
  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes || '00'}`
}

// Helper to convert 24h time to 12h format
const convertTo12Hour = (time24h: string): string => {
  const [hours, minutes] = time24h.split(':')
  const hour24 = parseInt(hours)
  let hour12 = hour24
  const period = hour24 >= 12 ? 'PM' : 'AM'
  
  if (hour24 === 0) {
    hour12 = 12
  } else if (hour24 > 12) {
    hour12 = hour24 - 12
  }
  
  return `${hour12}:${minutes || '00'} ${period}`
}

// Helper to add hours to a time and return in 12h format
const addHoursToTime = (time12h: string, hoursToAdd: number): string => {
  const time24h = convertTo24Hour(time12h)
  const [hours, minutes] = time24h.split(':')
  const totalMinutes = parseInt(hours) * 60 + parseInt(minutes || '0') + (hoursToAdd * 60)
  const newHour24 = Math.floor(totalMinutes / 60) % 24
  const newMinutes = totalMinutes % 60
  const newTime24h = `${newHour24.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
  return convertTo12Hour(newTime24h)
}

// Helper to format date for display
const formatDateDisplay = (date: Date): string => {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEE, MMM d')
}

// Helper to get date string in YYYY-MM-DD format
const getDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd')
}

export default function CourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateString, setSelectedDateString] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [duration, setDuration] = useState<number>(1)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [showWeeklyView, setShowWeeklyView] = useState(false)
  const [availabilityByDate, setAvailabilityByDate] = useState<{ [key: string]: any[] }>({})
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [deletingImage, setDeletingImage] = useState<string | null>(null)
  const [settingMainPhoto, setSettingMainPhoto] = useState<string | null>(null)

  // Check authentication and admin status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      
      // If authenticated, check admin status
      if (session) {
        try {
          const response = await fetch('/api/profile')
          if (response.ok) {
            const profile = await response.json()
            setIsAdmin(profile.is_admin === true)
          }
        } catch (err) {
          console.error('Error checking admin status:', err)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    }
    checkAuth()

    const supabase = createBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session)
      
      // Check admin status when auth state changes
      if (session) {
        try {
          const response = await fetch('/api/profile')
          if (response.ok) {
            const profile = await response.json()
            setIsAdmin(profile.is_admin === true)
          }
        } catch (err) {
          console.error('Error checking admin status:', err)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Validate and filter court images client-side
  const validImages = useMemo(() => {
    if (!court || !court.images) return []
    
    let imgArray: string[] = []
    if (Array.isArray(court.images)) {
      imgArray = court.images
    } else if (typeof court.images === 'string') {
      try {
        imgArray = JSON.parse(court.images)
      } catch (e) {
        imgArray = []
      }
    }
    
    // Filter out invalid URLs client-side as safety net
    return imgArray.filter((img: string) => {
      if (typeof img !== 'string') return false
      const trimmed = img.trim()
      // Reject photo IDs without full URLs
      if (/^photo-\d+-\w+$/.test(trimmed) && !trimmed.includes('http')) return false
      // Only allow full URLs or relative paths
      return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
    })
  }, [court?.images])

  // Fetch court data and availability
  useEffect(() => {
    fetchCourtData()
  }, [params.id])

  const handleSetMainPhoto = async (imageUrl: string) => {
    if (validImages[0] === imageUrl) {
      return // Already main photo
    }

    setSettingMainPhoto(imageUrl)
    try {
      const response = await fetch(`/api/courts/${court?.id}/images?url=${encodeURIComponent(imageUrl)}`, {
        method: 'PUT',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set main photo')
      }

      // Refresh court data
      await fetchCourtData()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to set main photo')
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setSettingMainPhoto(null)
    }
  }

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return
    }

    setDeletingImage(imageUrl)
    try {
      const response = await fetch(`/api/courts/${court?.id}/images?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete image')
      }

      // Refresh court data
      await fetchCourtData()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to delete image')
      setTimeout(() => setUploadError(null), 3000)
    } finally {
      setDeletingImage(null)
    }
  }

  const fetchCourtData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch court basic info
      const courtResponse = await fetch(`/api/courts/${params.id}`)
      if (!courtResponse.ok) {
        throw new Error('Court not found')
      }
      
      const courtData = await courtResponse.json()
      
      // Transform court data
      const transformedCourt: Court = {
        id: courtData.id,
        name: courtData.name,
        location: {
          address: courtData.address,
          city: courtData.city,
          state: courtData.state,
          zipCode: courtData.zipCode || courtData.zip_code || '',
          coordinates: {
            lat: courtData.latitude || 0,
            lng: courtData.longitude || 0,
          },
        },
        distance: courtData.distance || 0,
        price: {
          peak: courtData.peakPrice || courtData.peak_price || 0,
          offPeak: courtData.offPeakPrice || courtData.off_peak_price || 0,
        },
        surface: courtData.surface,
        rating: courtData.rating || 0,
        reviewCount: courtData.reviewCount || courtData.review_count || 0,
        amenities: typeof courtData.amenities === 'string' 
          ? JSON.parse(courtData.amenities) 
          : (courtData.amenities || []),
        images: typeof courtData.images === 'string' 
          ? JSON.parse(courtData.images) 
          : (courtData.images || []),
        availableDays: (() => {
          // Ensure all courts have all 7 days available
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          const parsedDays = typeof courtData.availableDays === 'string'
            ? JSON.parse(courtData.availableDays)
            : (courtData.availableDays || [])
          // If no days specified or empty, default to all 7 days
          return parsedDays.length > 0 ? parsedDays : days
        })(),
        totalCourts: courtData.totalCourts || courtData.total_courts || 1,
        courtNumbers: Array.from(
          { length: courtData.totalCourts || courtData.total_courts || 1 },
          (_, i) => `Court ${i + 1}`
        ),
        description: courtData.description || '',
        timeSlots: {},
      }

      // Generate default time slots (7 AM to 9 PM) in 12h format
      const generateDefaultTimeSlots = (totalCourts: number) => {
        const slots = []
        for (let hour = 7; hour <= 21; hour++) {
          let hour12 = hour
          const period = hour >= 12 ? 'PM' : 'AM'
          
          if (hour === 0) {
            hour12 = 12
          } else if (hour > 12) {
            hour12 = hour - 12
          }
          
          const time12h = `${hour12}:00 ${period}`
          
          // All courts available by default
          const availableCourts = Array.from({ length: totalCourts }, (_, i) => ({
            number: `Court ${i + 1}`,
            isAvailable: true,
          }))
          
          slots.push({
            time: time12h,
            availableCourts,
          })
        }
        return slots
      }

      // Set court immediately for fast initial render
      setCourt(transformedCourt)
      setLoading(false)

      // Fetch availability for next 14 days in one batch request
      const today = startOfToday()
      const dateStrings = Array.from({ length: 14 }, (_, i) =>
        getDateString(addDays(today, i))
      )
      const datesQuery = dateStrings.join(',')

      try {
        const availabilityResponse = await fetch(
          `/api/courts/${params.id}/availability?dates=${encodeURIComponent(datesQuery)}`
        )
        if (availabilityResponse.ok) {
          const batch: Record<string, { time: string; availableCourts: { number: string; isAvailable: boolean }[] }[]> =
            await availabilityResponse.json()
          const availabilityMap: { [key: string]: any[] } = {}
          for (const dateStr of dateStrings) {
            const slots = batch[dateStr]
            if (slots?.length) {
              availabilityMap[dateStr] = slots.map((slot: any) => {
                const [hours, minutes] = slot.time.split(':')
                const hour24 = parseInt(hours, 10)
                let hour12 = hour24
                const period = hour24 >= 12 ? 'PM' : 'AM'
                if (hour24 === 0) hour12 = 12
                else if (hour24 > 12) hour12 = hour24 - 12
                const time12h = `${hour12}:${minutes || '00'} ${period}`
                return {
                  time: time12h,
                  availableCourts: slot.availableCourts || [],
                }
              })
            } else {
              availabilityMap[dateStr] = generateDefaultTimeSlots(transformedCourt.totalCourts)
            }
          }
          setAvailabilityByDate(availabilityMap)
        } else {
          const fallback: { [key: string]: any[] } = {}
          dateStrings.forEach((d) => {
            fallback[d] = generateDefaultTimeSlots(transformedCourt.totalCourts)
          })
          setAvailabilityByDate(fallback)
        }
      } catch (err) {
        console.error('Error fetching batch availability:', err)
        const fallback: { [key: string]: any[] } = {}
        dateStrings.forEach((d) => {
          fallback[d] = generateDefaultTimeSlots(transformedCourt.totalCourts)
        })
        setAvailabilityByDate(fallback)
      }

    } catch (err) {
      console.error('Error fetching court:', err)
      setError(err instanceof Error ? err.message : 'Failed to load court')
      setLoading(false)
    }
  }

  const surfaceColors: Record<string, string> = {
    Hard: 'bg-blue-100 text-blue-800',
    Clay: 'bg-orange-100 text-orange-800',
    Grass: 'bg-green-100 text-green-800',
    'Artificial Grass': 'bg-emerald-100 text-emerald-800',
    Carpet: 'bg-purple-100 text-purple-800',
  }

  const getAvailableTimeSlots = () => {
    if (!selectedDateString) return []
    return availabilityByDate[selectedDateString] || []
  }

  const fetchAvailabilityForDate = async (date: Date) => {
    const dateStr = getDateString(date)
    if (availabilityByDate[dateStr]) return

    try {
      const res = await fetch(
        `/api/courts/${params.id}/availability?dates=${encodeURIComponent(dateStr)}`
      )
      if (!res.ok) return
      const batch = await res.json()
      const slots = batch[dateStr]
      const totalCourts = court?.totalCourts ?? 1
      const timeSlots = (slots ?? []).map((slot: any) => {
        const [hours, minutes] = slot.time.split(':')
        const hour24 = parseInt(hours, 10)
        let hour12 = hour24
        const period = hour24 >= 12 ? 'PM' : 'AM'
        if (hour24 === 0) hour12 = 12
        else if (hour24 > 12) hour12 = hour24 - 12
        const time12h = `${hour12}:${minutes || '00'} ${period}`
        return { time: time12h, availableCourts: slot.availableCourts || [] }
      })
      setAvailabilityByDate((prev) => ({
        ...prev,
        [dateStr]: timeSlots.length > 0 ? timeSlots : (() => {
          const defaultSlots = []
          for (let hour = 7; hour <= 21; hour++) {
            let h12 = hour
            const period = hour >= 12 ? 'PM' : 'AM'
            if (hour > 12) h12 = hour - 12
            defaultSlots.push({
              time: `${h12}:00 ${period}`,
              availableCourts: Array.from({ length: totalCourts }, (_, i) => ({
                number: `Court ${i + 1}`,
                isAvailable: true,
              })),
            })
          }
          return defaultSlots
        })(),
      }))
    } catch (err) {
      console.error('Error fetching availability for', dateStr, err)
    }
  }

  const handleDateChange = (date: Date | null) => {
    if (!date) return
    
    setSelectedDate(date)
    setSelectedDateString(getDateString(date))
    setSelectedTime('')
    setSelectedCourt('')
    
    // Fetch availability if we don't have it
    fetchAvailabilityForDate(date)
  }

  const handleDurationChange = (hours: number) => {
    setDuration(hours)
    setSelectedTime('')
    setSelectedCourt('')
  }

  /** Courts available for a given start time and duration (full consecutive hours). */
  const getAvailableCourtsForTimeAndDuration = (time: string, dur: number) => {
    if (!selectedDateString) return []
    const slots = getAvailableTimeSlots()
    const timeSlot = slots.find((ts: TimeSlotAvailability) => ts.time === time)
    if (!timeSlot) return []
    return timeSlot.availableCourts.filter((c: { number: string; isAvailable: boolean }) => {
      if (!c.isAvailable) return false
      if (dur <= 1) return true
      for (let i = 1; i < dur; i++) {
        const nextTime = addHoursToTime(time, i)
        const nextSlot = slots.find((ts: TimeSlotAvailability) => ts.time === nextTime)
        if (!nextSlot) return false
        const courtInNext = nextSlot.availableCourts.find((ac: { number: string; isAvailable: boolean }) => ac.number === c.number)
        if (!courtInNext || !courtInNext.isAvailable) return false
      }
      return true
    })
  }

  const getAvailableCourtsForTime = () => {
    if (!selectedDate || !selectedTime) return []
    return getAvailableCourtsForTimeAndDuration(selectedTime, duration)
  }

  /** For selected time: number of courts available for each duration (1–4 hrs). Used for recommendations. */
  const getCourtCountByDurationAtSelectedTime = (): Record<number, number> => {
    const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    if (!selectedTime) return result
    const slots = getAvailableTimeSlots()
    const startSlot = slots.find((ts: TimeSlotAvailability) => ts.time === selectedTime)
    if (!startSlot) return result
    for (const c of startSlot.availableCourts) {
      if (!c.isAvailable) continue
      let maxH = 1
      for (let h = 1; h <= 3; h++) {
        const nextTime = addHoursToTime(selectedTime, h)
        const nextSlot = slots.find((ts: TimeSlotAvailability) => ts.time === nextTime)
        if (!nextSlot) break
        const courtInNext = nextSlot.availableCourts.find(
          (ac: { number: string; isAvailable: boolean }) => ac.number === c.number
        )
        if (!courtInNext || !courtInNext.isAvailable) break
        maxH = h + 1
      }
      const maxDuration = Math.min(maxH, 4)
      for (let d = 1; d <= maxDuration; d++) result[d] = (result[d] || 0) + 1
    }
    return result
  }

  const handleBooking = () => {
    if (selectedDateString && selectedTime && selectedCourt) {
      setShowBookingModal(true)
      setBookingError(null)
    }
  }

  const confirmBooking = async () => {
    if (!court || !selectedDate || !selectedTime || !selectedCourt) return

    try {
      setBookingError(null)
      
      // Use the selected date directly
      const bookingDate = selectedDate
      const startTime24h = convertTo24Hour(selectedTime)
      
      // For recurring bookings, we need to determine the day of week
      const dayOfWeek = format(bookingDate, 'EEEE')
      
      const bookingData = {
        courtId: court.id,
        courtNumber: selectedCourt,
        bookingDate: bookingDate.toISOString(),
        startTime: startTime24h,
        duration: duration,
        isRecurring: isRecurring,
        recurringPattern: isRecurring ? {
          frequency: recurringFrequency,
          daysOfWeek: [dayOfWeek],
        } : undefined,
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      setBookingConfirmed(true)
      
      // Refresh availability for the selected date
      if (selectedDate) {
        await fetchAvailabilityForDate(selectedDate)
      }
      
      // Refresh court data after booking
      setTimeout(async () => {
        await fetchCourtData()
        setShowBookingModal(false)
        setBookingConfirmed(false)
        setSelectedDate(null)
        setSelectedDateString('')
        setSelectedTime('')
        setSelectedCourt('')
        setDuration(1)
      }, 2000)
    } catch (err) {
      console.error('Error creating booking:', err)
      setBookingError(err instanceof Error ? err.message : 'Failed to create booking')
    }
  }

  const isPeakTime = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    const period = time.split(' ')[1]
    if (period === 'PM' && hour >= 5 && hour < 8) return true
    if (period === 'PM' && hour === 12) return true
    return false
  }

  const getPrice = (time: string) => {
    if (!court) return 0
    const pricePerHour = isPeakTime(time) ? court.price.peak : court.price.offPeak
    return pricePerHour * duration
  }

  const getPricePerHour = (time: string) => {
    if (!court) return 0
    return isPeakTime(time) ? court.price.peak : court.price.offPeak
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0EB' }}>
        <div className="text-center">
          <p className="text-gray-500 text-lg">Loading court...</p>
        </div>
      </div>
    )
  }

  if (error || !court) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0EB' }}>
        <div className="text-center">
          <p className="text-gray-500 text-lg">{error || 'Court not found'}</p>
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

  return (
    <div className="min-h-screen court-detail-page" style={{ background: '#F5F0EB' }}>
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

      <main className="court-detail-main max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Court Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Court Images Gallery */}
            <div className="bg-white rounded-[20px] shadow-md overflow-hidden">
              {validImages && validImages.length > 0 ? (
                <div className="relative">
                  {/* Main Image */}
                  <div className="relative overflow-hidden rounded-[20px] max-h-[480px] w-full group">
                    <img
                      src={validImages[0]}
                      alt={court.name}
                      className="w-full h-full max-h-[480px] object-cover"
                      onError={(e) => {
                        // Fallback to gradient if image fails
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    {/* Fallback gradient */}
                    <div className="hidden min-h-[320px] max-h-[480px] h-full bg-gradient-to-br from-clay-rust-dark via-clay-terracotta to-clay-rust-dark items-center justify-center">
                      <span className="text-white text-xl font-semibold">No Image Available</span>
                    </div>
                    {/* Surface type badge — SETRA style, admin overlay below */}
                    <span
                      className="absolute top-5 right-5 z-[1] rounded-[100px] py-1.5 px-4 text-[#1A1A1A]"
                      style={{
                        background: 'rgba(245,240,235,0.95)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '12px',
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {court.surface}
                    </span>
                    {/* Admin Controls Overlay */}
                    {isAuthenticated && isAdmin && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteImage(validImages[0])}
                          disabled={deletingImage === validImages[0]}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deletingImage === validImages[0] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail Gallery (if more than 1 image) */}
                  {validImages.length > 1 && (
                    <div className={`grid ${isAuthenticated && isAdmin ? 'grid-cols-4' : 'grid-cols-4'} gap-2 p-4 bg-gray-50`}>
                      {(isAuthenticated && isAdmin ? validImages.slice(1) : validImages.slice(1, 5)).map((image, idx) => (
                        <div key={idx} className="relative h-20 rounded-lg overflow-hidden group">
                          <img
                            src={image}
                            alt={`${court.name} ${idx + 2}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken thumbnail images
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {/* Admin Controls Overlay */}
                          {isAuthenticated && isAdmin && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                              <button
                                onClick={() => handleSetMainPhoto(image)}
                                disabled={settingMainPhoto === image}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {settingMainPhoto === image ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                  </>
                                ) : (
                                  'Set Main'
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteImage(image)}
                                disabled={deletingImage === image}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {deletingImage === image ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3 h-3" />
                                    Delete
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {!isAuthenticated || !isAdmin ? (
                        validImages.length > 5 && (
                          <div className="relative h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">+{validImages.length - 5}</span>
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[320px] max-h-[480px] rounded-[20px] overflow-hidden bg-gradient-to-br from-clay-rust-dark via-clay-terracotta to-clay-rust-dark relative flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">No Image Available</span>
                  <span
                    className="absolute top-5 right-5 z-[1] rounded-[100px] py-1.5 px-4 text-[#1A1A1A]"
                    style={{
                      background: 'rgba(245,240,235,0.95)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {court.surface}
                  </span>
                </div>
              )}
              
              {/* Image Upload Section (for admin users only — hidden from regular users) */}
              {isAuthenticated && isAdmin && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Manage Images</h3>
                  {uploadError && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                      {uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
                      Images uploaded successfully! Refresh to see them.
                    </div>
                  )}
                  <label
                    htmlFor={`court-image-upload-${court.id}`}
                    className={`block w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-clay-terracotta transition-colors text-center ${
                      uploadingImages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingImages ? (
                      <span className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-clay-terracotta border-t-transparent"></div>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Upload Images (JPEG, PNG, WebP, GIF - Max 10MB each)
                      </span>
                    )}
                  </label>
                  <input
                    id={`court-image-upload-${court.id}`}
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingImages}
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files || files.length === 0) return

                      setUploadingImages(true)
                      setUploadError(null)
                      setUploadSuccess(false)

                      try {
                        const formData = new FormData()
                        Array.from(files).forEach((file) => {
                          formData.append('files', file)
                        })

                        const response = await fetch(`/api/courts/${court.id}/images`, {
                          method: 'POST',
                          body: formData,
                        })

                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || 'Failed to upload images')
                        }

                        setUploadSuccess(true)
                        // Refresh court data
                        await fetchCourtData()
                        // Clear success message after 3 seconds
                        setTimeout(() => setUploadSuccess(false), 3000)
                      } catch (err) {
                        setUploadError(err instanceof Error ? err.message : 'Failed to upload images')
                      } finally {
                        setUploadingImages(false)
                        // Reset file input
                        e.target.value = ''
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Court Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1
                className="font-medium text-[#1A1A1A] mb-3"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  marginBottom: '12px',
                }}
              >
                {court.name}
              </h1>

              <div
                className="flex flex-wrap items-center gap-1.5 mb-6 text-[#8A8279]"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 400 }}
              >
                <span>
                  {court.location.address}, {court.location.city}, {court.location.state} {court.location.zipCode}
                </span>
                <span aria-hidden>·</span>
                <span>{court.distance} miles away</span>
              </div>

              <div
                className="flex flex-wrap items-center gap-2 mb-6 text-[#1A1A1A]"
                style={{ marginBottom: '24px', fontFamily: "'DM Sans', sans-serif" }}
              >
                <span className="inline-block w-5 h-5 shrink-0 text-[#F5A623]"><Star className="w-full h-full fill-current" /></span>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>{court.rating}</span>
                <span style={{ fontSize: '14px', fontWeight: 400, color: '#8A8279' }}>
                  ({court.reviewCount} reviews)
                </span>
                <span aria-hidden style={{ color: '#8A8279' }}>·</span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  ${court.price.offPeak} - ${court.price.peak}/hr
                </span>
              </div>

              <p
                className="text-[#1A1A1A] mb-6"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '15px',
                  fontWeight: 300,
                  lineHeight: 1.7,
                }}
              >
                {court.description}
              </p>

              {/* Court Information */}
              <div className="mb-6">
                <h3
                  className="font-medium text-[#1A1A1A] mb-3"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px' }}
                >
                  Court Information
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className="rounded-xl px-5 py-4"
                    style={{ background: '#F5F0EB', borderRadius: '12px', padding: '16px 20px' }}
                  >
                    <p
                      className="uppercase text-[#8A8279] mb-0.5"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                      }}
                    >
                      Total Courts
                    </p>
                    <p
                      className="font-semibold text-[#C41E2A]"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '20px', fontWeight: 600 }}
                    >
                      {court.totalCourts}
                    </p>
                  </div>
                  <div
                    className="rounded-xl px-5 py-4"
                    style={{ background: '#F5F0EB', borderRadius: '12px', padding: '16px 20px' }}
                  >
                    <p
                      className="uppercase text-[#8A8279] mb-0.5"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                      }}
                    >
                      Surface Type
                    </p>
                    <p
                      className="font-semibold text-[#1A1A1A]"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '20px', fontWeight: 600 }}
                    >
                      {court.surface}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3
                  className="font-medium text-[#1A1A1A] mb-3"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px' }}
                >
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {court.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="rounded-[100px] px-4 py-2 text-[#1A1A1A]"
                      style={{
                        background: '#F5F0EB',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                        fontWeight: 400,
                        padding: '8px 16px',
                      }}
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
                <h3
                  className="font-medium text-[#1A1A1A]"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px' }}
                >
                  Weekly Availability
                </h3>
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
            <div id="booking-widget" className="booking-widget">
              <h2 className="booking-widget-heading">Book a Court</h2>

              {/* Duration Selection */}
              <div className="mb-6">
                <span className="booking-widget-label">
                  <Clock className="w-4 h-4 booking-widget-label-icon shrink-0" />
                  Duration
                </span>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[1, 2, 3, 4].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => handleDurationChange(hours)}
                      className={`booking-widget-btn ${duration === hours ? 'booking-widget-btn-selected' : ''}`}
                    >
                      {hours} {hours === 1 ? 'hour' : 'hours'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <span className="booking-widget-label">
                  <Calendar className="w-4 h-4 booking-widget-label-icon shrink-0" />
                  Select date
                </span>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Today', date: startOfToday() },
                    { label: 'Tomorrow', date: addDays(startOfToday(), 1) },
                    { label: format(addDays(startOfToday(), 2), 'EEE'), date: addDays(startOfToday(), 2) },
                    { label: format(addDays(startOfToday(), 3), 'EEE'), date: addDays(startOfToday(), 3) },
                  ].map(({ label, date }) => {
                    const dateStr = getDateString(date)
                    const isSelected = selectedDate && isSameDay(selectedDate, date)
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleDateChange(date)}
                        className={`booking-widget-btn ${isSelected ? 'booking-widget-btn-selected' : ''}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="date"
                  min={getDateString(startOfToday())}
                  max={getDateString(addDays(startOfToday(), 90))}
                  value={selectedDateString}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDateChange(parseISO(e.target.value))
                    }
                  }}
                  className="booking-widget-input"
                />
                {selectedDate && (
                  <p className="mt-2 text-xs text-[#8A8279]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Selected: {formatDateDisplay(selectedDate)}
                  </p>
                )}
              </div>

              {/* Time Selection */}
              {selectedDateString && (
                <div className="mb-6">
                  <span className="booking-widget-label">
                    <Clock className="w-4 h-4 booking-widget-label-icon shrink-0" />
                    Select time
                  </span>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {getAvailableTimeSlots().map((timeSlot) => {
                      const availableCount = getAvailableCourtsForTimeAndDuration(timeSlot.time, duration).length
                      const hasAvailability = availableCount > 0
                      const isSelected = selectedTime === timeSlot.time
                      return (
                        <button
                          key={timeSlot.time}
                          type="button"
                          onClick={() => {
                            setSelectedTime(timeSlot.time)
                            setSelectedCourt('')
                          }}
                          disabled={!hasAvailability}
                          className={`booking-widget-btn relative ${isSelected ? 'booking-widget-btn-selected' : ''}`}
                        >
                          {timeSlot.time}
                          {hasAvailability && (
                            <span
                              className={`absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-xs font-bold rounded-full ${
                                isSelected
                                  ? 'bg-white text-[#C41E2A] ring-2 ring-white'
                                  : 'bg-[#34C759] text-white'
                              }`}
                            >
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
                  <span className="booking-widget-label">Select court</span>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {getAvailableCourtsForTime().map((courtOption: IndividualCourt) => (
                      <button
                        key={courtOption.number}
                        type="button"
                        onClick={() => setSelectedCourt(courtOption.number)}
                        className={`booking-widget-btn ${selectedCourt === courtOption.number ? 'booking-widget-btn-selected' : ''}`}
                      >
                        {courtOption.number}
                      </button>
                    ))}
                  </div>
                  {getAvailableCourtsForTime().length === 0 && (() => {
                    const byDur = getCourtCountByDurationAtSelectedTime()
                    const alternatives = ([1, 2, 3, 4] as const)
                      .filter((d) => d !== duration && (byDur[d] ?? 0) > 0)
                      .map((d) => `${byDur[d]} court${byDur[d] === 1 ? '' : 's'} for ${d} ${d === 1 ? 'hour' : 'hours'}`)
                    const hasAlternatives = alternatives.length > 0
                    return (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <p className="text-amber-800 font-medium">
                          No courts available for {duration} {duration === 1 ? 'hour' : 'hours'} at this time.
                        </p>
                        {hasAlternatives && (
                          <p className="text-amber-700 mt-1">
                            Try instead: {alternatives.join('; ')}.
                          </p>
                        )}
                        {!hasAlternatives && (
                          <p className="text-amber-700 mt-1">Try another time or date.</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Price Display */}
              {selectedTime && (
                <div className="mb-6 p-4 rounded-xl border border-[#E8E0D8]" style={{ background: '#F5F0EB' }}>
                  <div className="flex justify-between items-center mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>
                    <span className="text-[#8A8279]">Price per hour</span>
                    <span className="font-semibold text-[#1A1A1A]">${getPricePerHour(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span className="text-sm font-medium text-[#1A1A1A]">Total ({duration} {duration === 1 ? 'hour' : 'hours'})</span>
                    <span className="text-lg font-bold text-[#C41E2A]">${getPrice(selectedTime).toFixed(2)}</span>
                  </div>
                  {isPeakTime(selectedTime) && (
                    <p className="text-xs text-[#8A8279]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Peak hours pricing</p>
                  )}
                </div>
              )}

              {/* Recurring Booking Option */}
              <div className="mb-6">
                <label className="booking-widget-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  <span className="booking-widget-checkbox-box">
                    {isRecurring && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 5l3.5 3.5L11 1" />
                      </svg>
                    )}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 400, color: '#1A1A1A' }}>
                    Make this a recurring booking
                  </span>
                </label>
                {isRecurring && (
                  <div className="mt-3 ml-8">
                    <label className="block text-xs text-[#8A8279] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Frequency</label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                      className="booking-widget-input"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Book Button — same onClick / Supabase booking flow */}
              <button
                type="button"
                onClick={handleBooking}
                disabled={!selectedDateString || !selectedTime || !selectedCourt}
                className="booking-widget-book-btn"
              >
                Book now
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile-only fixed bottom bar: price + Book Now (scrolls to widget) */}
      <div className="booking-bottom-bar" aria-label="Booking summary">
        <span className="booking-bottom-bar-price">
          ${court.price.offPeak} – ${court.price.peak}/hr
        </span>
        <button
          type="button"
          className="booking-bottom-bar-btn"
          onClick={() => document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Book Now
        </button>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            {!bookingConfirmed ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">Confirm Booking</h3>
                  <button
                    onClick={() => {
                      setShowBookingModal(false)
                      setBookingError(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {bookingError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{bookingError}</p>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Court</p>
                    <p className="font-semibold text-gray-900">{court.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDate && (() => {
                        const formattedDate = format(selectedDate, 'EEEE, MMMM d, yyyy')
                        const endTime = addHoursToTime(selectedTime, duration)
                        return `${formattedDate}, ${selectedTime} - ${endTime}`
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Court Number</p>
                    <p className="font-semibold text-gray-900">{selectedCourt}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-semibold text-gray-900">
                      {duration} {duration === 1 ? 'hour' : 'hours'}
                    </p>
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
                    <p className="text-2xl font-bold text-terracotta">
                      ${getPrice(selectedTime).toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={confirmBooking}
                  className="w-full btn-premium text-white py-3 rounded-xl font-semibold"
                >
                  Confirm booking
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
