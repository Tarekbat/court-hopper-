import { createAdminClient } from '../lib/supabase-server'

async function main() {
  console.log('Seeding Supabase database...')

  const supabase = createAdminClient()

  // Note: For production, users should be created through Supabase Auth
  // This seed script assumes you'll create the demo user through the signup flow
  // or manually in the Supabase dashboard. We'll just seed the courts here.

  // Seed courts from mock data
  const courtsData = [
    {
      id: '1',
      name: 'Crandon Park Tennis Center',
      address: '7300 Crandon Blvd',
      city: 'Key Biscayne',
      state: 'FL',
      zip_code: '33149',
      latitude: 25.6925,
      longitude: -80.1556,
      peak_price: 25,
      off_peak_price: 15,
      surface: 'Hard',
      rating: 4.8,
      review_count: 342,
      total_courts: 13,
      description:
        'Premier public tennis facility in Key Biscayne. Home to the Miami Open, featuring 13 hard courts with professional lighting. Beautiful ocean views and well-maintained facilities.',
      images: [
        'https://images.unsplash.com/photo-1622163642999-9584742c66b8?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=800&fit=crop&q=80',
      ],
      amenities: ['Lights', 'Parking', 'Restrooms', 'Water Fountains', 'Pro Shop'],
      available_days: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    {
      id: '2',
      name: 'Flamingo Park Tennis Center',
      address: '1000 12th St',
      city: 'Miami Beach',
      state: 'FL',
      zip_code: '33139',
      latitude: 25.7906,
      longitude: -80.1300,
      peak_price: 20,
      off_peak_price: 12,
      surface: 'Hard',
      rating: 4.7,
      review_count: 289,
      total_courts: 19,
      description:
        'Popular public tennis center in the heart of Miami Beach. 19 well-maintained hard courts with excellent lighting for evening play. Great community atmosphere.',
      images: [
        'https://images.unsplash.com/photo-1622279457486-62dcc4a431f7?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=800&fit=crop&q=80',
      ],
      amenities: [
        'Lights',
        'Parking',
        'Restrooms',
        'Water Fountains',
        'Seating Area',
      ],
      available_days: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    {
      id: '3',
      name: 'Tampa Bay Park Tennis Courts',
      address: '400 N Ashley Dr',
      city: 'Tampa',
      state: 'FL',
      zip_code: '33602',
      latitude: 27.9506,
      longitude: -82.4572,
      peak_price: 18,
      off_peak_price: 10,
      surface: 'Hard',
      rating: 4.6,
      review_count: 198,
      total_courts: 8,
      description:
        'Scenic public tennis facility along the Hillsborough River. 8 hard courts with beautiful waterfront views. Perfect for recreational play with family and friends.',
      images: [
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1622163642999-9584742c66b8?w=1200&h=800&fit=crop&q=80',
      ],
      amenities: ['Lights', 'Parking', 'Restrooms', 'Water Fountains'],
      available_days: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    {
      id: '4',
      name: 'Lake Cane Tennis Center',
      address: '8495 Turkey Lake Rd',
      city: 'Orlando',
      state: 'FL',
      zip_code: '32819',
      latitude: 28.4500,
      longitude: -81.4700,
      peak_price: 22,
      off_peak_price: 14,
      surface: 'Clay',
      rating: 4.9,
      review_count: 267,
      total_courts: 12,
      description:
        'Premier public clay court facility in Orlando. 12 professional-grade clay courts with excellent drainage. Perfect for players who prefer the slower pace and softer surface of clay.',
      images: [
        'https://images.unsplash.com/photo-1601925260368-ae2f83d48767?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1601925260368-ae2f83d48767?ixlib=rb-4.0.3&w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1601925260368-ae2f83d48767?auto=format&w=1200&h=800&fit=crop&q=80',
      ],
      amenities: [
        'Lights',
        'Parking',
        'Restrooms',
        'Water Fountains',
        'Pro Shop',
      ],
      available_days: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    {
      id: '5',
      name: 'Holiday Park Tennis Center',
      address: '701 NE 12th Ave',
      city: 'Fort Lauderdale',
      state: 'FL',
      zip_code: '33304',
      latitude: 26.1224,
      longitude: -80.1374,
      peak_price: 20,
      off_peak_price: 12,
      surface: 'Hard',
      rating: 4.5,
      review_count: 312,
      total_courts: 18,
      description:
        'Historic public tennis facility in Fort Lauderdale. 18 hard courts with excellent lighting. Popular destination for both locals and visitors. Great community atmosphere.',
      images: [
        'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1622279457486-62dcc4a431f7?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=800&fit=crop&q=80',
      ],
      amenities: [
        'Lights',
        'Parking',
        'Restrooms',
        'Water Fountains',
        'Seating Area',
      ],
      available_days: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
  ]

  for (const courtData of courtsData) {
    const { error } = await supabase.from('courts').upsert(courtData, {
      onConflict: 'id',
    })

    if (error) {
      console.error(`Error seeding court ${courtData.id}:`, error)
    } else {
      console.log(`Seeded court: ${courtData.name}`)
    }
  }

  console.log(`Seeded ${courtsData.length} courts`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

