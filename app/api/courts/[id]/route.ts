import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format, parse, addHours } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // ISO date string

    const court = await prisma.court.findUnique({
      where: { id: params.id },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    // Get availability for the requested date
    let availability: any[] = []
    if (date) {
      const requestedDate = new Date(date)
      const dayOfWeek = requestedDate.getDay() // 0 = Sunday, 1 = Monday, etc.

      // Get all bookings for this date
      const bookings = await prisma.booking.findMany({
        where: {
          courtId: params.id,
          bookingDate: {
            gte: new Date(requestedDate.setHours(0, 0, 0, 0)),
            lt: new Date(requestedDate.setHours(23, 59, 59, 999)),
          },
          status: 'confirmed',
        },
      })

      // Generate time slots (e.g., 7 AM to 9 PM)
      const timeSlots = []
      for (let hour = 7; hour <= 21; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`
        const endTime = format(addHours(parse(time, 'HH:mm', new Date()), 1), 'HH:mm')

        // Check which courts are available at this time
        const bookedCourts = bookings
          .filter((b) => {
            const bookingStart = parse(b.startTime, 'HH:mm', new Date())
            const bookingEnd = parse(b.endTime, 'HH:mm', new Date())
            const slotStart = parse(time, 'HH:mm', new Date())
            const slotEnd = parse(endTime, 'HH:mm', new Date())

            return (
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
              (slotStart <= bookingStart && slotEnd >= bookingEnd)
            )
          })
          .map((b) => b.courtNumber)

        const availableCourts = Array.from({ length: court.totalCourts }, (_, i) => {
          const courtNumber = `Court ${i + 1}`
          return {
            number: courtNumber,
            isAvailable: !bookedCourts.includes(courtNumber),
          }
        })

        timeSlots.push({
          time,
          availableCourts,
        })
      }

      availability = timeSlots
    }

    return NextResponse.json({
      ...court,
      availability,
    })
  } catch (error) {
    console.error('Error fetching court:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

