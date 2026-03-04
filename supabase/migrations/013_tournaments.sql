-- Tournaments: brackets, skill-based divisions, registration, results, standings

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
  organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'registration_closed', 'live', 'completed')),
  bracket_type TEXT NOT NULL DEFAULT 'single_elimination' CHECK (bracket_type IN ('single_elimination', 'double_elimination', 'round_robin')),
  max_participants INTEGER,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_sport_id ON public.tournaments(sport_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id ON public.tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON public.tournaments(starts_at);

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Divisions (e.g. by skill level)
CREATE TABLE IF NOT EXISTS public.tournament_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill_level_min INTEGER,
  skill_level_max INTEGER,
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_divisions_tournament_id ON public.tournament_divisions(tournament_id);

CREATE TRIGGER update_tournament_divisions_updated_at
  BEFORE UPDATE ON public.tournament_divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Registrations
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.tournament_divisions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  seed INTEGER,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_division_id ON public.tournament_registrations(division_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);

-- Brackets (one per division for single elim)
CREATE TABLE IF NOT EXISTS public.brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.tournament_divisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, division_id)
);

CREATE INDEX IF NOT EXISTS idx_brackets_tournament_id ON public.brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_brackets_division_id ON public.brackets(division_id);

CREATE TRIGGER update_brackets_updated_at
  BEFORE UPDATE ON public.brackets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bracket matches
CREATE TABLE IF NOT EXISTS public.bracket_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES public.brackets(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_order INTEGER NOT NULL,
  player1_registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  player2_registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  court_id TEXT REFERENCES public.courts(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'bye', 'cancelled')),
  player1_score INTEGER,
  player2_score INTEGER,
  score_detail JSONB,
  winner_registration_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bracket_matches_bracket_id ON public.bracket_matches(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_round ON public.bracket_matches(bracket_id, round);

CREATE TRIGGER update_bracket_matches_updated_at
  BEFORE UPDATE ON public.bracket_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Standings (for round-robin or display)
CREATE TABLE IF NOT EXISTS public.tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.tournament_divisions(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  matches_won INTEGER NOT NULL DEFAULT 0,
  matches_drawn INTEGER NOT NULL DEFAULT 0,
  sets_won INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(division_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_standings_tournament_id ON public.tournament_standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_division_id ON public.tournament_standings(division_id);

-- RLS: tournaments (public read when not draft)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are readable when not draft or user is organizer"
  ON public.tournaments FOR SELECT TO authenticated
  USING (status != 'draft' OR organizer_id = auth.uid()::text);

CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid()::text);

CREATE POLICY "Organizer can update tournament"
  ON public.tournaments FOR UPDATE TO authenticated USING (organizer_id = auth.uid()::text);

CREATE POLICY "Organizer can delete tournament"
  ON public.tournaments FOR DELETE TO authenticated USING (organizer_id = auth.uid()::text);

-- RLS: tournament_divisions
ALTER TABLE public.tournament_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Divisions readable when tournament is readable"
  ON public.tournament_divisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_divisions.tournament_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage divisions"
  ON public.tournament_divisions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_divisions.tournament_id AND t.organizer_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_divisions.tournament_id AND t.organizer_id = auth.uid()::text));

-- RLS: tournament_registrations
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrations readable by organizer or participant"
  ON public.tournament_registrations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_registrations.tournament_id AND t.organizer_id = auth.uid()::text)
  );

CREATE POLICY "Users can register themselves when registration open"
  ON public.tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can cancel own registration; organizer can update"
  ON public.tournament_registrations FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_registrations.tournament_id AND t.organizer_id = auth.uid()::text)
  );

CREATE POLICY "Users can delete own registration; organizer can delete any"
  ON public.tournament_registrations FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_registrations.tournament_id AND t.organizer_id = auth.uid()::text)
  );

-- RLS: brackets
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brackets readable when tournament is readable"
  ON public.brackets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = brackets.tournament_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage brackets"
  ON public.brackets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = brackets.tournament_id AND t.organizer_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = brackets.tournament_id AND t.organizer_id = auth.uid()::text));

-- RLS: bracket_matches
ALTER TABLE public.bracket_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bracket matches readable when tournament is readable"
  ON public.bracket_matches FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brackets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = bracket_matches.bracket_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage bracket matches"
  ON public.bracket_matches FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brackets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = bracket_matches.bracket_id AND t.organizer_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brackets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = bracket_matches.bracket_id AND t.organizer_id = auth.uid()::text
  ));

-- RLS: tournament_standings
ALTER TABLE public.tournament_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings readable when tournament is readable"
  ON public.tournament_standings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_standings.tournament_id
    AND (t.status != 'draft' OR t.organizer_id = auth.uid()::text)
  ));

CREATE POLICY "Organizer can manage standings"
  ON public.tournament_standings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_standings.tournament_id AND t.organizer_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_standings.tournament_id AND t.organizer_id = auth.uid()::text));
