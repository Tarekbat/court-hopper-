-- Player ratings + discovery fields
-- Hybrid model:
-- - Global default ratings live on public.users
-- - Optional per-sport overrides + discovery fields live on public.play_partner_profiles

-- Global user ratings / verification
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ntrp_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS utr_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS usta_membership_number TEXT,
  ADD COLUMN IF NOT EXISTS rating_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_source TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON public.users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city);

-- Per-sport overrides + discovery metadata
ALTER TABLE public.play_partner_profiles
  ADD COLUMN IF NOT EXISTS ntrp_rating_override NUMERIC,
  ADD COLUMN IF NOT EXISTS utr_rating_override NUMERIC,
  ADD COLUMN IF NOT EXISTS available_now_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS play_styles JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS surface_preferences JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_play_partner_profiles_available_now_until
  ON public.play_partner_profiles(available_now_until DESC);

-- Basic checks (soft; allow NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_ntrp_rating_range'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_ntrp_rating_range
      CHECK (ntrp_rating IS NULL OR (ntrp_rating >= 1.0 AND ntrp_rating <= 7.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_play_partner_profiles_ntrp_override_range'
  ) THEN
    ALTER TABLE public.play_partner_profiles
      ADD CONSTRAINT chk_play_partner_profiles_ntrp_override_range
      CHECK (ntrp_rating_override IS NULL OR (ntrp_rating_override >= 1.0 AND ntrp_rating_override <= 7.0));
  END IF;
END $$;

