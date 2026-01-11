import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  })

  console.log('Created user:', user.email)

  // Seed courts from mock data
  const courtsData = [
    {
      id: '1',
      name: 'Crandon Park Tennis Center',
      address: '7300 Crandon Blvd',
      city: 'Key Biscayne',
      state: 'FL',
      zipCode: '33149',
      latitude: 25.6925,
      longitude: -80.1556,
      peakPrice: 25,
      offPeakPrice: 15,
      surface: 'Hard',
      rating: 4.8,
      reviewCount: 342,
      totalCourts: 13,
      description: 'Premier public tennis facility in Key Biscayne. Home to the Miami Open, featuring 13 hard courts with professional lighting. Beautiful ocean views and well-maintained facilities.',
      images: '["/court1.jpg"]',
      amenities: '["Lights","Parking","Restrooms","Water Fountains","Pro Shop"]',
      availableDays: '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]',
    },
    {
      id: '2',
      name: 'Flamingo Park Tennis Center',
      address: '1000 12th St',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      latitude: 25.7906,
      longitude: -80.1300,
      peakPrice: 20,
      offPeakPrice: 12,
      surface: 'Hard',
      rating: 4.7,
      reviewCount: 289,
      totalCourts: 19,
      description: 'Popular public tennis center in the heart of Miami Beach. 19 well-maintained hard courts with excellent lighting for evening play. Great community atmosphere.',
      images: JSON.stringify(['/court2.jpg']),
      amenities: JSON.stringify(['Lights', 'Parking', 'Restrooms', 'Water Fountains', 'Seating Area']),
      availableDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    },
    {
      id: '3',
      name: 'Tampa Bay Park Tennis Courts',
      address: '400 N Ashley Dr',
      city: 'Tampa',
      state: 'FL',
      zipCode: '33602',
      latitude: 27.9506,
      longitude: -82.4572,
      peakPrice: 18,
      offPeakPrice: 10,
      surface: 'Hard',
      rating: 4.6,
      reviewCount: 198,
      totalCourts: 8,
      description: 'Scenic public tennis facility along the Hillsborough River. 8 hard courts with beautiful waterfront views. Perfect for recreational play with family and friends.',
      images: JSON.stringify(['/court3.jpg']),
      amenities: JSON.stringify(['Lights', 'Parking', 'Restrooms', 'Water Fountains']),
      availableDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    },
    {
      id: '4',
      name: 'Lake Cane Tennis Center',
      address: '8495 Turkey Lake Rd',
      city: 'Orlando',
      state: 'FL',
      zipCode: '32819',
      latitude: 28.4500,
      longitude: -81.4700,
      peakPrice: 22,
      offPeakPrice: 14,
      surface: 'Clay',
      rating: 4.9,
      reviewCount: 267,
      totalCourts: 12,
      description: 'Premier public clay court facility in Orlando. 12 professional-grade clay courts with excellent drainage. Perfect for players who prefer the slower pace and softer surface of clay.',
      images: JSON.stringify(['/court4.jpg']),
      amenities: JSON.stringify(['Lights', 'Parking', 'Restrooms', 'Water Fountains', 'Pro Shop']),
      availableDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    },
    {
      id: '5',
      name: 'Holiday Park Tennis Center',
      address: '701 NE 12th Ave',
      city: 'Fort Lauderdale',
      state: 'FL',
      zipCode: '33304',
      latitude: 26.1224,
      longitude: -80.1374,
      peakPrice: 20,
      offPeakPrice: 12,
      surface: 'Hard',
      rating: 4.5,
      reviewCount: 312,
      totalCourts: 18,
      description: 'Historic public tennis facility in Fort Lauderdale. 18 hard courts with excellent lighting. Popular destination for both locals and visitors. Great community atmosphere.',
      images: JSON.stringify(['/court5.jpg']),
      amenities: JSON.stringify(['Lights', 'Parking', 'Restrooms', 'Water Fountains', 'Seating Area']),
      availableDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    },
  ]

  for (const courtData of courtsData) {
    await prisma.court.upsert({
      where: { id: courtData.id },
      update: {},
      create: courtData,
    })
  }

  console.log(`Seeded ${courtsData.length} courts`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

