-- Add optional city to users for "near you" and location-based features
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.users.city IS 'Optional city for location-based discovery (e.g. players/groups near you)';
