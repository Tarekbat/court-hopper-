# Tennis Court Scheduler - Demo Ready

A fully functional tennis court booking application built with Next.js 14, TypeScript, Prisma, and NextAuth.

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Setup:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add NEXTAUTH_SECRET (generate with: openssl rand -base64 32)

# 3. Set up database
npx prisma generate
npx prisma db push
npx prisma db seed

# 4. Run the app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `password123`

## ✨ Features

### ✅ Fully Implemented

- **User Authentication**
  - Sign up / Sign in with email and password
  - Session management with NextAuth
  - Protected routes

- **Court Management**
  - Browse tennis courts with detailed information
  - Search and filter by location, surface, price, rating
  - Map view with Leaflet
  - Court detail pages with availability

- **Booking System**
  - Create bookings with date and time selection
  - Real-time availability checking
  - Booking cancellation (24-hour advance notice)
  - Recurring bookings support
  - View all your bookings

- **Payment Integration**
  - Stripe payment processing (test mode)
  - Payment intent creation
  - Payment status tracking

- **Database**
  - SQLite database with Prisma ORM
  - User, Court, Booking, Review models
  - Seeded with sample data

- **API Routes**
  - RESTful API for all operations
  - Authentication middleware
  - Error handling and validation

## 📁 Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/        # Authentication endpoints
│   │   ├── bookings/    # Booking CRUD
│   │   ├── courts/      # Court data
│   │   └── payments/    # Payment processing
│   ├── auth/            # Auth pages (signin/signup)
│   ├── bookings/        # User bookings page
│   └── court/           # Court detail pages
├── components/          # React components
├── lib/                 # Utilities
│   ├── auth.ts         # NextAuth config
│   ├── prisma.ts       # Database client
│   └── stripe.ts       # Stripe config
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed script
└── types/              # TypeScript types
```

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (Prisma ORM)
- **Authentication:** NextAuth.js v5
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Maps:** Leaflet / React Leaflet

## 📝 Environment Variables

Required:
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Secret for session encryption
- `NEXTAUTH_URL` - Your app URL

Optional:
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - For payments
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For OAuth
- `RESEND_API_KEY` - For email notifications

## 🧪 Testing

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Use any future expiry date and any CVC

### Database Management
```bash
# View database
npx prisma studio

# Reset database
rm prisma/dev.db
npx prisma db push
npx prisma db seed
```

## 🚢 Production Deployment

1. **Database:** Switch to PostgreSQL or MySQL
2. **Environment:** Set production environment variables
3. **Stripe:** Use live API keys
4. **Email:** Configure email service
5. **Hosting:** Deploy to Vercel, Railway, or similar

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- API routes are documented in code comments
- Database schema in `prisma/schema.prisma`

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- Sessions are encrypted with JWT
- API routes are protected with authentication
- SQL injection prevented by Prisma
- Input validation with Zod

## 📄 License

MIT

## 🙏 Acknowledgments

Built as a demo application showcasing modern web development practices with Next.js, TypeScript, and Prisma.
