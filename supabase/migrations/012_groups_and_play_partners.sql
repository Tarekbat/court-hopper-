-- Groups: create/join sports groups, plan play days
-- Play partners: discover others looking to play (find players)

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  city TEXT,
  region TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_sport_id ON public.groups(sport_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_is_public ON public.groups(is_public);
CREATE INDEX IF NOT EXISTS idx_groups_city ON public.groups(city);

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Group members (join table with role)
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- Group events (play days / sessions)
CREATE TABLE IF NOT EXISTS public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  court_booking_id TEXT REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_scheduled_at ON public.group_events(scheduled_at);

CREATE TRIGGER update_group_events_updated_at
  BEFORE UPDATE ON public.group_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Play partner profiles: "looking to play" per sport
CREATE TABLE IF NOT EXISTS public.play_partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
  skill_level INTEGER CHECK (skill_level >= 1 AND skill_level <= 5),
  preferred_locations JSONB DEFAULT '[]'::jsonb,
  preferred_days_times JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport_id)
);

CREATE INDEX IF NOT EXISTS idx_play_partner_profiles_user_id ON public.play_partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_play_partner_profiles_sport_id ON public.play_partner_profiles(sport_id);
CREATE INDEX IF NOT EXISTS idx_play_partner_profiles_is_active ON public.play_partner_profiles(is_active);

CREATE TRIGGER update_play_partner_profiles_updated_at
  BEFORE UPDATE ON public.play_partner_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Play requests: invite/request to play
CREATE TABLE IF NOT EXISTS public.play_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_play_requests_from_user_id ON public.play_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_play_requests_to_user_id ON public.play_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_play_requests_status ON public.play_requests(status);

CREATE TRIGGER update_play_requests_updated_at
  BEFORE UPDATE ON public.play_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public groups are readable by authenticated users"
  ON public.groups FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()::text
  ));

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY "Group creators and admins can update group"
  ON public.groups FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()::text AND gm.role = 'admin')
  );

CREATE POLICY "Group creators can delete group"
  ON public.groups FOR DELETE TO authenticated USING (created_by = auth.uid()::text);

-- RLS: group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their group's members"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()::text)
  );

CREATE POLICY "Users can join groups (self) or be added by admin/creator"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.groups g
    LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()::text
    WHERE g.id = group_members.group_id AND (g.created_by = auth.uid()::text OR gm.role = 'admin')
  ));

CREATE POLICY "Users can leave or admins can remove members"
  ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()::text AND gm.role = 'admin'
  ));

-- RLS: group_events
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read events"
  ON public.group_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_events.group_id AND gm.user_id = auth.uid()::text
  ));

CREATE POLICY "Group members can create events"
  ON public.group_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_events.group_id AND gm.user_id = auth.uid()::text
  ));

CREATE POLICY "Event creator or group admin can update/delete event"
  ON public.group_events FOR UPDATE TO authenticated USING (created_by = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_events.group_id AND gm.user_id = auth.uid()::text AND gm.role = 'admin'
  ));

CREATE POLICY "Event creator or group admin can delete event"
  ON public.group_events FOR DELETE TO authenticated USING (created_by = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_events.group_id AND gm.user_id = auth.uid()::text AND gm.role = 'admin'
  ));

-- RLS: play_partner_profiles
ALTER TABLE public.play_partner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active profiles are readable by authenticated users"
  ON public.play_partner_profiles FOR SELECT TO authenticated
  USING (is_active = true OR user_id = auth.uid()::text);

CREATE POLICY "Users can manage own profile"
  ON public.play_partner_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- RLS: play_requests
ALTER TABLE public.play_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read requests they sent or received"
  ON public.play_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text);

CREATE POLICY "Authenticated users can send play requests"
  ON public.play_requests FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid()::text);

CREATE POLICY "Recipient can update request status"
  ON public.play_requests FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid()::text);