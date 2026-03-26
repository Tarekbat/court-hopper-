-- Beta safety + runtime controls

-- 1) Block system (bidirectional checks in app layer)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks"
  ON public.user_blocks FOR ALL TO authenticated
  USING (blocker_id = auth.uid()::text)
  WITH CHECK (blocker_id = auth.uid()::text);

-- 2) Report / moderation queue
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('user', 'message', 'group_post', 'group_name')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status_created
  ON public.moderation_reports(status, created_at DESC);

CREATE TRIGGER update_moderation_reports_updated_at
  BEFORE UPDATE ON public.moderation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports"
  ON public.moderation_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid()::text);

CREATE POLICY "Users read own reports"
  ON public.moderation_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid()::text);

-- 3) Email preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email_welcome BOOLEAN NOT NULL DEFAULT true,
  email_match_requests BOOLEAN NOT NULL DEFAULT true,
  email_group_invites BOOLEAN NOT NULL DEFAULT true,
  email_play_day_reminders BOOLEAN NOT NULL DEFAULT true,
  email_weekly_digest BOOLEAN NOT NULL DEFAULT true,
  email_digest_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (email_digest_frequency IN ('instant', 'daily', 'weekly', 'off')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
  ON public.user_notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- 4) Runtime settings on existing settings row
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS min_supported_version TEXT,
  ADD COLUMN IF NOT EXISTS digest_last_run_at TIMESTAMPTZ;

UPDATE public.settings
SET
  feature_flags = COALESCE(feature_flags, '{}'::jsonb),
  maintenance_mode = COALESCE(maintenance_mode, false),
  app_version = COALESCE(NULLIF(app_version, ''), 'v1')
WHERE id = 'app';
