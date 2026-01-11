# Setup Guide - Tennis Court Scheduler

This guide will help you set up the Tennis Court Scheduler application for demo/testing purposes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- (Optional) Stripe account for payment testing
- (Optional) Email service account (Resend, SendGrid, etc.) for notifications

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- Prisma (database ORM)
- NextAuth (authentication)
- Stripe (payments)
- And other dependencies

### 2. Set Up Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and configure:

**Required:**
- `DATABASE_URL` - SQLite database path (default: `file:./dev.db`)
- `NEXTAUTH_SECRET` - Generate a random secret: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your app URL (default: `http://localhost:3000`)

**Optional (for full functionality):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - For payment processing
- `RESEND_API_KEY` - For email notifications

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Create database and run migrations
npx prisma db push

# Seed the database with sample data
npx prisma db seed
```

This will:
- Create the SQLite database
- Set up all tables
- Create a demo user (email: `demo@example.com`, password: `password123`)
- Seed 5 sample tennis courts

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

After seeding, you can sign in with:
- **Email:** `demo@example.com`
- **Password:** `password123`

Or create a new account using the sign-up page.

## Testing Payments (Stripe)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your test API keys from the Stripe Dashboard
3. Add them to your `.env` file:
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
```bash
npx prisma studio
```
Opens a visual database browser at `http://localhost:5555`

### Reset Database
```bash
# Delete database
rm prisma/dev.db

# Recreate and seed
npx prisma db push
npx prisma db seed
```

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/        # Authentication endpoints
│   │   ├── bookings/    # Booking CRUD operations
│   │   ├── courts/      # Court data endpoints
│   │   └── payments/    # Payment processing
│   ├── auth/            # Authentication pages
│   ├── bookings/        # User bookings page
│   └── court/           # Court detail pages
├── components/          # React components
├── lib/                 # Utility functions
│   ├── auth.ts         # NextAuth configuration
│   ├── prisma.ts       # Database client
│   └── stripe.ts       # Stripe configuration
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Database seeding script
└── types/              # TypeScript types
```

## Features Implemented

✅ User authentication (credentials + OAuth ready)
✅ Database with Prisma + SQLite
✅ Real booking creation and persistence
✅ Booking cancellation
✅ Court listings with search and filters
✅ Payment integration (Stripe)
✅ API routes for all operations
✅ Date-based booking system
✅ Availability checking

## Next Steps for Production

1. **Database:** Switch from SQLite to PostgreSQL or MySQL
2. **Hosting:** Deploy to Vercel, Railway, or similar
3. **Email:** Set up Resend or SendGrid for notifications
4. **Payments:** Configure Stripe webhooks for payment confirmation
5. **Security:** Add rate limiting, CSRF protection
6. **Monitoring:** Add error tracking (Sentry, etc.)
7. **Testing:** Add unit and integration tests

## Troubleshooting

### Database errors
- Make sure you've run `npx prisma generate` and `npx prisma db push`
- Check that `DATABASE_URL` in `.env` is correct

### Authentication not working
- Verify `NEXTAUTH_SECRET` is set in `.env`
- Check that `NEXTAUTH_URL` matches your app URL

### Payment errors
- Ensure Stripe keys are test keys (start with `pk_test_` and `sk_test_`)
- Check Stripe dashboard for error logs

## Support

For issues or questions, check the code comments or create an issue in the repository.

