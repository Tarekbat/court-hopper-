-- One-time backfill:
-- Ensure all users who already have at least one play profile
-- are publicly visible in discovery.
UPDATE public.users u
SET profile_is_public = true
WHERE EXISTS (
  SELECT 1
  FROM public.play_partner_profiles p
  WHERE p.user_id = u.id
);
