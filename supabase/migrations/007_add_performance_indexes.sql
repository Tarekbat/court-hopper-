-- Performance optimization indexes
-- These indexes significantly improve query performance for common operations

-- Composite index for user bookings query (filters by user_id, status, booking_date)
-- Used by: /api/bookings?status=confirmed&upcoming=true
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_date 
ON public.bookings(user_id, status, booking_date DESC);

-- Index for upcoming bookings query (partial index for confirmed bookings)
-- Used by: /api/bookings?upcoming=true
-- Note: Cannot use NOW() in index predicate as it's not immutable
-- This index will help with confirmed bookings, filtering by date in queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_upcoming
ON public.bookings(user_id, booking_date DESC)
WHERE status = 'confirmed';

-- Composite index for batch availability queries
-- Used by: /api/courts/availability (filters by court_id, status, booking_date)
CREATE INDEX IF NOT EXISTS idx_bookings_court_status_date 
ON public.bookings(court_id, status, booking_date);

-- Index for date range queries on bookings
-- Used by: availability checks and date filtering
CREATE INDEX IF NOT EXISTS idx_bookings_date_range 
ON public.bookings(booking_date) 
WHERE status = 'confirmed';

-- Index for court lookups in bookings
-- Used by: booking queries that join with courts
CREATE INDEX IF NOT EXISTS idx_bookings_court_id 
ON public.bookings(court_id) 
WHERE status = 'confirmed';

