-- Crown-style tournament system: teams, groups, group stage + knockout

-- 1. Extend tournaments table
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS team_size INTEGER NOT NULL DEFAULT 1 CHECK (team_size IN (1, 2)),
  ADD COLUMN IF NOT EXISTS groups_count INTEGER;

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_bracket_type_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_bracket_type_check
  CHECK (bracket_type IN ('single_elimination', 'double_elimination', 'round_robin', 'group_knockout'));

-- 2. Teams (one per entry: 1 member = singles, 2 = doubles)
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id   UUID NOT NULL REFERENCES public.tournament_divisions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON public.tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_division_id ON public.tournament_teams(division_id);

CREATE TABLE IF NOT EXISTS public.tournament_team_members (
  team_id  UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_team_members_user_id ON public.tournament_team_members(user_id);

-- 3. Groups (round-robin pools: "A", "B", ...)
CREATE TABLE IF NOT EXISTS public.tournament_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id   UUID NOT NULL REFERENCES public.tournament_divisions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament_id ON public.tournament_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_groups_division_id ON public.tournament_groups(division_id);

CREATE TABLE IF NOT EXISTS public.tournament_group_teams (
  group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  team_id  UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id)
);

-- 4. Extend tournament_registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS partner_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL;

-- 5. Extend bracket_matches with phase, group, team, game scores, result type
-- bracket_id becomes nullable so group-phase matches can exist without a knockout bracket
ALTER TABLE public.bracket_matches
  ALTER COLUMN bracket_id DROP NOT NULL;

-- Add tournament_id directly to bracket_matches for easy querying of group matches
ALTER TABLE public.bracket_matches
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bracket_matches_tournament_id ON public.bracket_matches(tournament_id);

ALTER TABLE public.bracket_matches
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'knockout'
    CHECK (phase IN ('group', 'knockout')),
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team1_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team2_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team1_score INTEGER,
  ADD COLUMN IF NOT EXISTS team2_score INTEGER,
  ADD COLUMN IF NOT EXISTS games_won_1 INTEGER,
  ADD COLUMN IF NOT EXISTS games_won_2 INTEGER,
  ADD COLUMN IF NOT EXISTS result_type TEXT CHECK (result_type IN ('normal', 'walkover', 'default', 'dq'));

-- 6. Extend tournament_standings with group, team, games differential
ALTER TABLE public.tournament_standings
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matches_lost INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_differential INTEGER NOT NULL DEFAULT 0;

-- 7. RLS for new tables

-- tournament_teams
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams readable when tournament is readable"
  ON public.tournament_teams FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_teams.tournament_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage teams"
  ON public.tournament_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_teams.tournament_id AND t.organizer_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_teams.tournament_id AND t.organizer_id = auth.uid()::text));

CREATE POLICY "Participants can create their own team"
  ON public.tournament_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournament_registrations tr
    WHERE tr.tournament_id = tournament_teams.tournament_id
    AND tr.division_id = tournament_teams.division_id
    AND tr.user_id = auth.uid()::text
  ));

-- tournament_team_members
ALTER TABLE public.tournament_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members readable when tournament is readable"
  ON public.tournament_team_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournament_teams tt
    JOIN public.tournaments t ON t.id = tt.tournament_id
    WHERE tt.id = tournament_team_members.team_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Anyone can insert team members during registration"
  ON public.tournament_team_members FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Organizer can manage team members"
  ON public.tournament_team_members FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournament_teams tt
    JOIN public.tournaments t ON t.id = tt.tournament_id
    WHERE tt.id = tournament_team_members.team_id AND t.organizer_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournament_teams tt
    JOIN public.tournaments t ON t.id = tt.tournament_id
    WHERE tt.id = tournament_team_members.team_id AND t.organizer_id = auth.uid()::text
  ));

-- tournament_groups
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups readable when tournament is readable"
  ON public.tournament_groups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_groups.tournament_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage groups"
  ON public.tournament_groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_groups.tournament_id AND t.organizer_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_groups.tournament_id AND t.organizer_id = auth.uid()::text));

-- tournament_group_teams
ALTER TABLE public.tournament_group_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group teams readable when tournament is readable"
  ON public.tournament_group_teams FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournament_groups tg
    JOIN public.tournaments t ON t.id = tg.tournament_id
    WHERE tg.id = tournament_group_teams.group_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage group teams"
  ON public.tournament_group_teams FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournament_groups tg
    JOIN public.tournaments t ON t.id = tg.tournament_id
    WHERE tg.id = tournament_group_teams.group_id AND t.organizer_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tournament_groups tg
    JOIN public.tournaments t ON t.id = tg.tournament_id
    WHERE tg.id = tournament_group_teams.group_id AND t.organizer_id = auth.uid()::text
  ));
