-- In-app notifications, DM + group chat, lightweight player matches

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'system'
    CHECK (category IN ('matches', 'social', 'groups', 'system')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Player matches (from accepted play requests + scheduling / scores)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_request_id UUID UNIQUE REFERENCES public.play_requests(id) ON DELETE SET NULL,
  player_a_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  player_b_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
  match_type TEXT NOT NULL DEFAULT 'singles'
    CHECK (match_type IN ('singles', 'doubles', 'practice')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'disputed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  location_label TEXT,
  court_id TEXT REFERENCES public.courts(id) ON DELETE SET NULL,
  score_jsonb JSONB,
  score_reported_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  score_confirmed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (player_a_id <> player_b_id)
);

CREATE INDEX IF NOT EXISTS idx_player_matches_a ON public.player_matches(player_a_id);
CREATE INDEX IF NOT EXISTS idx_player_matches_b ON public.player_matches(player_b_id);
CREATE INDEX IF NOT EXISTS idx_player_matches_status ON public.player_matches(status);

CREATE TRIGGER update_player_matches_updated_at
  BEFORE UPDATE ON public.player_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.player_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own matches"
  ON public.player_matches FOR SELECT TO authenticated
  USING (player_a_id = auth.uid()::text OR player_b_id = auth.uid()::text);

CREATE POLICY "Players update own matches"
  ON public.player_matches FOR UPDATE TO authenticated
  USING (player_a_id = auth.uid()::text OR player_b_id = auth.uid()::text)
  WITH CHECK (player_a_id = auth.uid()::text OR player_b_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Chat threads (direct pair or one per group)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_kind TEXT NOT NULL CHECK (thread_kind IN ('direct', 'group')),
  direct_pair_key TEXT UNIQUE,
  group_id UUID UNIQUE REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (thread_kind = 'direct' AND direct_pair_key IS NOT NULL AND group_id IS NULL)
    OR (thread_kind = 'group' AND group_id IS NOT NULL AND direct_pair_key IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_group ON public.chat_threads(group_id);

CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chat_thread_members (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_members_user ON public.chat_thread_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 4000),
  embed_match_id UUID REFERENCES public.player_matches(id) ON DELETE SET NULL,
  quick_reply_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON public.chat_messages(thread_id, created_at DESC);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read threads"
  ON public.chat_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_thread_members m
      WHERE m.thread_id = chat_threads.id AND m.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Members touch thread timestamp"
  ON public.chat_threads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_thread_members m
      WHERE m.thread_id = chat_threads.id AND m.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_thread_members m
      WHERE m.thread_id = chat_threads.id AND m.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Members read memberships"
  ON public.chat_thread_members FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Members update own last_read"
  ON public.chat_thread_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Members read messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_thread_members m
      WHERE m.thread_id = chat_messages.thread_id AND m.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Members send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.chat_thread_members m
      WHERE m.thread_id = chat_messages.thread_id AND m.user_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
