import { PrismaClient } from '@prisma/client'
import { createAdminClient } from '../lib/supabase-server'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting data migration from SQLite to Supabase...')

  const supabase = createAdminClient()

  try {
    // Migrate Users
    console.log('Migrating users...')
    const users = await prisma.user.findMany()
    for (const user of users) {
      const { error } = await supabase.from('users').upsert(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified,
          image: user.image,
          password: user.password,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating user ${user.id}:`, error)
      } else {
        console.log(`Migrated user: ${user.email}`)
      }
    }
    console.log(`Migrated ${users.length} users`)

    // Migrate Accounts
    console.log('Migrating accounts...')
    const accounts = await prisma.account.findMany()
    for (const account of accounts) {
      const { error } = await supabase.from('accounts').upsert(
        {
          id: account.id,
          user_id: account.userId,
          type: account.type,
          provider: account.provider,
          provider_account_id: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating account ${account.id}:`, error)
      }
    }
    console.log(`Migrated ${accounts.length} accounts`)

    // Migrate Sessions
    console.log('Migrating sessions...')
    const sessions = await prisma.session.findMany()
    for (const session of sessions) {
      const { error } = await supabase.from('sessions').upsert(
        {
          id: session.id,
          session_token: session.sessionToken,
          user_id: session.userId,
          expires: session.expires.toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating session ${session.id}:`, error)
      }
    }
    console.log(`Migrated ${sessions.length} sessions`)

    // Migrate Verification Tokens
    console.log('Migrating verification tokens...')
    const verificationTokens = await prisma.verificationToken.findMany()
    for (const token of verificationTokens) {
      const { error } = await supabase.from('verification_tokens').upsert(
        {
          identifier: token.identifier,
          token: token.token,
          expires: token.expires.toISOString(),
        },
        { onConflict: 'identifier,token' }
      )

      if (error) {
        console.error(`Error migrating verification token:`, error)
      }
    }
    console.log(`Migrated ${verificationTokens.length} verification tokens`)

    // Migrate Courts
    console.log('Migrating courts...')
    const courts = await prisma.court.findMany()
    for (const court of courts) {
      // Parse JSON strings to arrays
      let images: string[] = []
      let amenities: string[] = []
      let availableDays: string[] = []

      try {
        images = JSON.parse(court.images)
      } catch {
        images = []
      }

      try {
        amenities = JSON.parse(court.amenities)
      } catch {
        amenities = []
      }

      try {
        availableDays = JSON.parse(court.availableDays)
      } catch {
        availableDays = []
      }

      const { error } = await supabase.from('courts').upsert(
        {
          id: court.id,
          name: court.name,
          address: court.address,
          city: court.city,
          state: court.state,
          zip_code: court.zipCode,
          latitude: court.latitude,
          longitude: court.longitude,
          distance: court.distance,
          peak_price: court.peakPrice,
          off_peak_price: court.offPeakPrice,
          surface: court.surface,
          rating: court.rating,
          review_count: court.reviewCount,
          total_courts: court.totalCourts,
          description: court.description,
          images: images,
          amenities: amenities,
          available_days: availableDays,
          created_at: court.createdAt.toISOString(),
          updated_at: court.updatedAt.toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating court ${court.id}:`, error)
      } else {
        console.log(`Migrated court: ${court.name}`)
      }
    }
    console.log(`Migrated ${courts.length} courts`)

    // Migrate Time Slots
    console.log('Migrating time slots...')
    const timeSlots = await prisma.timeSlot.findMany()
    for (const timeSlot of timeSlots) {
      const { error } = await supabase.from('time_slots').upsert(
        {
          id: timeSlot.id,
          court_id: timeSlot.courtId,
          day_of_week: timeSlot.dayOfWeek,
          start_time: timeSlot.startTime,
          end_time: timeSlot.endTime,
          is_available: timeSlot.isAvailable,
          created_at: timeSlot.createdAt.toISOString(),
          updated_at: timeSlot.updatedAt.toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating time slot ${timeSlot.id}:`, error)
      }
    }
    console.log(`Migrated ${timeSlots.length} time slots`)

    // Migrate Bookings
    console.log('Migrating bookings...')
    const bookings = await prisma.booking.findMany()
    for (const booking of bookings) {
      let recurringPattern = null
      if (booking.recurringPattern) {
        try {
          recurringPattern = JSON.parse(booking.recurringPattern)
        } catch {
          recurringPattern = null
        }
      }

      const { error } = await supabase.from('bookings').upsert(
        {
          id: booking.id,
          user_id: booking.userId,
          court_id: booking.courtId,
          court_number: booking.courtNumber,
          booking_date: booking.bookingDate.toISOString(),
          start_time: booking.startTime,
          end_time: booking.endTime,
          duration: booking.duration,
          price: booking.price,
          status: booking.status,
          is_recurring: booking.isRecurring,
          recurring_pattern: recurringPattern,
          payment_intent_id: booking.paymentIntentId,
          payment_status: booking.paymentStatus,
          created_at: booking.createdAt.toISOString(),
          updated_at: booking.updatedAt.toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating booking ${booking.id}:`, error)
      } else {
        console.log(`Migrated booking: ${booking.id}`)
      }
    }
    console.log(`Migrated ${bookings.length} bookings`)

    // Migrate Reviews
    console.log('Migrating reviews...')
    const reviews = await prisma.review.findMany()
    for (const review of reviews) {
      const { error } = await supabase.from('reviews').upsert(
        {
          id: review.id,
          court_id: review.courtId,
          user_id: review.userId,
          rating: review.rating,
          comment: review.comment,
          created_at: review.createdAt.toISOString(),
          updated_at: review.updatedAt.toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`Error migrating review ${review.id}:`, error)
      }
    }
    console.log(`Migrated ${reviews.length} reviews`)

    console.log('Data migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

