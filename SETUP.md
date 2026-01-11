# Setup Guide - Tennis Court Scheduler

This guide will help you set up the Tennis Court Scheduler application for demo/testing purposes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- (Optional) Stripe account for payment testing
- (Optional) Email service account (Resend, SendGrid, etc.) for notifications

## Installation Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Name: `tennis-scheduler` (or your preferred name)
   - Database Password: (save this securely)
   - Region: Choose closest to you
4. Wait for project to be created (takes ~2 minutes)

### 2. Set Up Database Schema

1. In your Supabase project dashboard, go to "SQL Editor"
2. Open the file `supabase/migrations/001_initial_schema.sql` from this project
3. Copy the entire SQL content
4. Paste it into the SQL Editor in Supabase
5. Click "Run" to execute the migration
6. This will create all necessary tables, indexes, and RLS policies

### 3. Get Supabase Credentials

1. In Supabase dashboard, go to "Settings" → "API"
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")
   - **service_role key** (under "Project API keys" → "service_role" - keep this secret!)

### 4. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- Supabase (database and authentication)
- Stripe (payments)
- And other dependencies

### 5. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Configuration (Optional - for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Email Service (Optional - for notifications)
RESEND_API_KEY=re_...
```

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

**Optional (for full functionality):**
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - For payment processing
- `RESEND_API_KEY` - For email notifications

### 6. Seed the Database

```bash
npm run db:seed
```

This will:
- Seed 5 sample tennis courts
- Note: Users should be created through the signup flow or Supabase Auth dashboard

### 7. (Optional) Migrate Existing Data

If you have existing data from SQLite/Prisma:

```bash
# Make sure DATABASE_URL is still set in .env.local for the migration
DATABASE_URL=file:./prisma/dev.db

# Run migration script
npm run db:migrate
```

This will transfer all data from SQLite to Supabase.

### 8. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Creating a Demo User

1. Go to the signup page: `http://localhost:3000/auth/signup`
2. Create an account with:
   - **Email:** `demo@example.com`
   - **Password:** `password123` (or any password)
3. The user will be created in Supabase Auth and the `public.users` table

Alternatively, you can create users directly in the Supabase dashboard:
1. Go to "Authentication" → "Users"
2. Click "Add user" → "Create new user"
3. Fill in email and password
4. The user record will be automatically created in `public.users` via triggers

## Testing Payments (Stripe)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your test API keys from the Stripe Dashboard
3. Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and any CVC

## Database Management

### View Database

1. Go to your Supabase dashboard
2. Navigate to "Table Editor" to view and edit data
3. Or use "SQL Editor" to run queries

### Reset Database

1. In Supabase dashboard, go to "SQL Editor"
2. Run:
   ```sql
   TRUNCATE TABLE courts, bookings, reviews, time_slots CASCADE;
   ```
3. Re-seed: `npm run db:seed`

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/        # Authentication endpoints (Supabase Auth)
│   │   ├── bookings/    # Booking CRUD operations
│   │   ├── courts/      # Court data endpoints
│   │   └── payments/    # Payment processing
│   ├── auth/            # Authentication pages
│   ├── bookings/        # User bookings page
│   └── court/           # Court detail pages
├── components/          # React components
├── lib/                 # Utility functions
│   ├── auth.ts         # Supabase Auth helpers
│   ├── supabase.ts     # Supabase client configuration
│   └── stripe.ts       # Stripe configuration
├── supabase/
│   ├── migrations/     # Database migration files
│   └── seed.ts         # Database seeding script
├── scripts/
│   └── migrate-to-supabase.ts  # Data migration script
└── types/              # TypeScript types
```

## Features Implemented

✅ User authentication (Supabase Auth - email/password)
✅ Database with Supabase (PostgreSQL)
✅ Real booking creation and persistence
✅ Booking cancellation
✅ Court listings with search and filters
✅ Payment integration (Stripe)
✅ API routes for all operations
✅ Date-based booking system
✅ Availability checking
✅ Row Level Security (RLS) policies

## Next Steps for Production

1. **Database:** Already using PostgreSQL via Supabase (production-ready)
2. **Hosting:** Deploy to Vercel, Railway, or similar
3. **Email:** Set up Resend or SendGrid for notifications
4. **Payments:** Configure Stripe webhooks for payment confirmation
5. **Security:** Review and adjust RLS policies as needed
6. **Monitoring:** Add error tracking (Sentry, etc.)
7. **Testing:** Add unit and integration tests
8. **Backups:** Configure Supabase automatic backups

## Troubleshooting

### Database errors
- Make sure you've run the SQL migration in Supabase dashboard
- Check that Supabase environment variables in `.env.local` are correct
- Verify RLS policies are set up correctly

### Authentication not working
- Verify Supabase credentials are set in `.env.local`
- Check Supabase dashboard → Authentication → Settings
- Ensure email confirmation is disabled for development (Settings → Auth → Email Auth)

### Payment errors
- Ensure Stripe keys are test keys (start with `pk_test_` and `sk_test_`)
- Check Stripe dashboard for error logs

### Migration issues
- Ensure `DATABASE_URL` is set if migrating from SQLite
- Check that all tables exist in Supabase before running migration
- Verify foreign key relationships are correct

## Support

For issues or questions, check the code comments or create an issue in the repository.
