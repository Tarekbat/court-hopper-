-- Additive: fields required for admin court management (status, contact/reservation, hours)
-- Data preservation: no drops, no destructive changes.

-- Status: controls public visibility and booking availability
ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courts_status_check'
  ) THEN
    ALTER TABLE public.courts
    ADD CONSTRAINT courts_status_check
    CHECK (status IN ('active', 'temporarily_closed', 'permanently_closed'));
  END IF;
END $$;

-- Contact + reservation metadata
ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS reservation_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reservation_link TEXT,
ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Hours model
-- - hours_24_7: currently still maps to the app's internal scheduling window (7:00-21:00)
-- - hours_by_day: { "Monday": { "open": "07:00", "close": "21:00" }, ... }
--   "close" is interpreted as the LAST available 1-hour start time (matches existing 7-21 slot semantics).
ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS hours_24_7 BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_by_day JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Multi-surface support for admin UI (public logic currently uses `surface` for compatibility)
ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS surfaces JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_courts_status ON public.courts(status);
CREATE INDEX IF NOT EXISTS idx_courts_city_status ON public.courts(city, status);

