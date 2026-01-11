-- Initial schema migration from Prisma to Supabase
-- Note: Supabase Auth automatically creates auth.users, auth.accounts, auth.sessions tables
-- We'll create a public.users table that references auth.users for our application data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create public.users table (extends auth.users)
-- This table stores additional user data not in auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password TEXT, -- For credentials provider (if still needed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create accounts table (for OAuth providers if needed)
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

-- Create sessions table (if needed for custom session management)
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);

-- Create courts table
CREATE TABLE IF NOT EXISTS public.courts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance DOUBLE PRECISION,
  peak_price DOUBLE PRECISION NOT NULL,
  off_peak_price DOUBLE PRECISION NOT NULL,
  surface TEXT NOT NULL,
  rating DOUBLE PRECISION DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  total_courts INTEGER NOT NULL,
  description TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  available_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for courts
CREATE INDEX IF NOT EXISTS idx_courts_city ON public.courts(city);
CREATE INDEX IF NOT EXISTS idx_courts_surface ON public.courts(surface);

-- Create time_slots table
CREATE TABLE IF NOT EXISTS public.time_slots (
  id TEXT PRIMARY KEY,
  court_id TEXT NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TEXT NOT NULL, -- e.g., "09:00"
  end_time TEXT NOT NULL, -- e.g., "10:00"
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for time_slots
CREATE INDEX IF NOT EXISTS idx_time_slots_court_day ON public.time_slots(court_id, day_of_week);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  court_id TEXT NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  court_number TEXT NOT NULL,
  booking_date TIMESTAMPTZ NOT NULL,
  start_time TEXT NOT NULL, -- e.g., "09:00"
  end_time TEXT NOT NULL, -- e.g., "10:00"
  duration DOUBLE PRECISION NOT NULL, -- in hours
  price DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, completed
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON public.bookings(court_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  court_id TEXT NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(court_id, user_id)
);

-- Create index for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_court_id ON public.reviews(court_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON public.time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid()::text = id);

-- Courts are publicly readable
CREATE POLICY "Courts are publicly readable" ON public.courts
  FOR SELECT USING (true);

-- Bookings: users can read their own bookings
CREATE POLICY "Users can read own bookings" ON public.bookings
  FOR SELECT USING (auth.uid()::text = user_id);

-- Bookings: users can create their own bookings
CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Bookings: users can update their own bookings
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Reviews are publicly readable
CREATE POLICY "Reviews are publicly readable" ON public.reviews
  FOR SELECT USING (true);

-- Reviews: users can create their own reviews
CREATE POLICY "Users can create own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Reviews: users can update their own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid()::text = user_id);

