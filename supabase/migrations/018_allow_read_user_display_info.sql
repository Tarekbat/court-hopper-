-- Allow authenticated users to read other users' display info (name, image, etc.)
-- so that tournament brackets, groups, play partners, and similar features can show names.
-- The existing "Users can read own data" policy remains; this adds read access for all
-- authenticated users (RLS is per-row, so we allow SELECT for display purposes).
CREATE POLICY "Authenticated can read user display info"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);
