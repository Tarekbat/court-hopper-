-- Account-level profile visibility.
-- Default is public unless user changes it in settings.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_is_public BOOLEAN NOT NULL DEFAULT true;

-- Ensure existing rows are treated as public.
UPDATE public.users
SET profile_is_public = true
WHERE profile_is_public IS NULL;
