-- Fix infinite recursion in group_members (and group_events) RLS policies.
-- Policies that reference group_members while evaluating group_members cause recursion.
-- Use SECURITY DEFINER functions that bypass RLS for the lookup.

CREATE OR REPLACE FUNCTION public.get_user_group_ids(uid text)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin_or_creator(uid text, gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = gid AND g.created_by = uid
  ) OR EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.group_id = gid AND gm.user_id = uid AND gm.role = 'admin'
  );
$$;

-- Drop and recreate group_members policies
DROP POLICY IF EXISTS "Members can read their group's members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups (self) or be added by admin/creator" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave or admins can remove members" ON public.group_members;

CREATE POLICY "Members can read their group's members"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text OR
    group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
  );

CREATE POLICY "Users can join groups (self) or be added by admin/creator"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text OR
    public.is_group_admin_or_creator(auth.uid()::text, group_id)
  );

CREATE POLICY "Users can leave or admins can remove members"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()::text OR
    public.is_group_admin_or_creator(auth.uid()::text, group_id)
  );

-- Drop and recreate group_events policies (they also referenced group_members)
DROP POLICY IF EXISTS "Group members can read events" ON public.group_events;
DROP POLICY IF EXISTS "Group members can create events" ON public.group_events;
DROP POLICY IF EXISTS "Event creator or group admin can update/delete event" ON public.group_events;
DROP POLICY IF EXISTS "Event creator or group admin can delete event" ON public.group_events;

CREATE POLICY "Group members can read events"
  ON public.group_events FOR SELECT TO authenticated
  USING (group_id IN (SELECT public.get_user_group_ids(auth.uid()::text)));

CREATE POLICY "Group members can create events"
  ON public.group_events FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()::text AND
    group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
  );

CREATE POLICY "Event creator or group admin can update event"
  ON public.group_events FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()::text OR
    public.is_group_admin_or_creator(auth.uid()::text, group_id)
  );

CREATE POLICY "Event creator or group admin can delete event"
  ON public.group_events FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()::text OR
    public.is_group_admin_or_creator(auth.uid()::text, group_id)
  );
