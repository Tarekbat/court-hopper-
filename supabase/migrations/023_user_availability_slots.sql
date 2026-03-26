-- User availability slots for discovery/profile
-- Stores a weekly pattern (not date-specific bookings).

CREATE TABLE IF NOT EXISTS public.user_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sun..6=Sat
  day_part TEXT NOT NULL CHECK (day_part IN ('morning', 'afternoon', 'evening')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, weekday, day_part)
);

CREATE INDEX IF NOT EXISTS idx_user_availability_slots_user_id
  ON public.user_availability_slots(user_id);

CREATE INDEX IF NOT EXISTS idx_user_availability_slots_weekday_day_part
  ON public.user_availability_slots(weekday, day_part);

CREATE TRIGGER update_user_availability_slots_updated_at
  BEFORE UPDATE ON public.user_availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_availability_slots ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their own slots
CREATE POLICY "Users can manage own availability slots"
  ON public.user_availability_slots FOR ALL TO authenticated
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- Authenticated users can read availability slots (for match scoring + profile display)
CREATE POLICY "Availability slots are readable by authenticated users"
  ON public.user_availability_slots FOR SELECT TO authenticated
  USING (true);

