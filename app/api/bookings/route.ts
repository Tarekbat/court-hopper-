import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addHours, parse, format } from 'date-fns'

const createBookingSchema = z.object({
  courtId: z.string(),
  courtNumber: z.string(),
  bookingDate: z.string(), // ISO date string
  startTime: z.string(),
  duration: z.number().min(0.5).max(4),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    endDate: z.string().optional(),
    daysOfWeek: z.array(z.string()).optional(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'confirmed'
    const upcoming = searchParams.get('upcoming') === 'true'

    const where: any = {
      userId: session.user.id,
    }

    if (status !== 'all') {
      where.status = status
    }

    if (upcoming) {
      where.bookingDate = {
        gte: new Date(),
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        court: true,
      },
      orderBy: {
        bookingDate: 'asc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBookingSchema.parse(body)

    // Check if court exists
    const court = await prisma.court.findUnique({
      where: { id: validatedData.courtId },
    })

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    // Check availability
    const bookingDate = new Date(validatedData.bookingDate)
    const startTime = validatedData.startTime
    const endTime = format(
      addHours(parse(startTime, 'HH:mm', new Date()), validatedData.duration),
      'HH:mm'
    )

    // Check for conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId: validatedData.courtId,
        courtNumber: validatedData.courtNumber,
        bookingDate: {
          gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        status: 'confirmed',
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      )
    }

    // Calculate price
    const hour = parseInt(startTime.split(':')[0])
    const isPeakTime = (hour >= 17 && hour < 20) || hour === 12
    const pricePerHour = isPeakTime ? court.peakPrice : court.offPeakPrice
    const totalPrice = pricePerHour * validatedData.duration

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        courtId: validatedData.courtId,
        courtNumber: validatedData.courtNumber,
        bookingDate: new Date(validatedData.bookingDate),
        startTime,
        endTime,
        duration: validatedData.duration,
        price: totalPrice,
        isRecurring: validatedData.isRecurring || false,
        recurringPattern: validatedData.recurringPattern
          ? JSON.stringify(validatedData.recurringPattern)
          : null,
        status: 'confirmed',
        paymentStatus: 'pending',
      },
      include: {
        court: true,
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

