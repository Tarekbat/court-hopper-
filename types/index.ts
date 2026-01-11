export type CourtSurface = 'Hard' | 'Clay' | 'Grass' | 'Carpet' | 'Artificial Grass'

export interface IndividualCourt {
  number: string // e.g., "Court 1", "Court A", etc.
  isAvailable: boolean
}

export interface TimeSlotAvailability {
  time: string
  availableCourts: IndividualCourt[]
}

export interface Court {
  id: string
  name: string
  location: {
    address: string
    city: string
    state: string
    zipCode: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  distance: number // in miles
  price: {
    peak: number // per hour
    offPeak: number // per hour
  }
  surface: CourtSurface
  rating: number
  reviewCount: number
  amenities: string[]
  images: string[]
  availableDays: string[] // ['Monday', 'Tuesday', etc.]
  totalCourts: number // Total number of courts at this facility
  courtNumbers: string[] // e.g., ["Court 1", "Court 2", "Court 3"]
  timeSlots: {
    [key: string]: TimeSlotAvailability[] // day -> array of time slots with available courts
  }
  description: string
}

export interface Booking {
  id: string
  courtId: string // Facility ID
  courtNumber: string // Specific court number (e.g., "Court 1")
  date: string // Day of week or specific date
  timeSlot: string
  duration: number // in hours
  isRecurring: boolean
  recurringPattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly'
    endDate?: string // Optional end date for recurring bookings
    daysOfWeek?: string[] // For weekly recurring
  }
  userId?: string // Optional user ID
}

export interface WeeklyAvailability {
  day: string
  timeSlots: TimeSlotAvailability[]
}

