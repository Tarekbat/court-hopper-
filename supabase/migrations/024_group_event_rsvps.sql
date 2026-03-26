-- RSVP / waitlist for group play days + optional capacity on events

ALTER TABLE public.group_events
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity > 0);

COMMENT ON COLUMN public.group_events.max_capacity IS 'Max confirmed "going" spots; null = unlimited';

CREATE TABLE IF NOT EXISTS public.group_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'no')),
  waitlist_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id),
  CHECK (
    (status IN ('maybe', 'no') AND waitlist_position IS NULL)
    OR (status = 'going' AND (waitlist_position IS NULL OR waitlist_position > 0))
  )
);

CREATE INDEX IF NOT EXISTS idx_group_event_rsvps_event_id ON public.group_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_group_event_rsvps_event_status ON public.group_event_rsvps(event_id, status);

CREATE TRIGGER update_group_event_rsvps_updated_at
  BEFORE UPDATE ON public.group_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.group_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Members of the group can read all RSVPs for events in that group
CREATE POLICY "Group members can read event RSVPs"
  ON public.group_event_rsvps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_events ge
      WHERE ge.id = group_event_rsvps.event_id
        AND ge.group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
    )
  );

-- Members can insert/update only their own RSVP
CREATE POLICY "Members can upsert own RSVP"
  ON public.group_event_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.group_events ge
      WHERE ge.id = group_event_rsvps.event_id
        AND ge.group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
    )
  );

CREATE POLICY "Members can update own RSVP"
  ON public.group_event_rsvps FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Members can delete own RSVP"
  ON public.group_event_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

-- Realtime for live counts (idempotent on Supabase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_event_rsvps'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_event_rsvps;
  END IF;
END $$;
