import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const surface = searchParams.get('surface')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const search = searchParams.get('search')

    const where: any = {}

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (surface && surface !== 'All') {
      where.surface = surface
    }

    if (maxPrice) {
      where.peakPrice = { lte: parseFloat(maxPrice) }
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    const courts = await prisma.court.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: 'confirmed',
              },
            },
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
    })

    return NextResponse.json(courts)
  } catch (error) {
    console.error('Error fetching courts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

