-- Add team1_score and team2_score columns to bracket_matches
-- These are used for team-based (group_knockout) tournaments
ALTER TABLE public.bracket_matches
  ADD COLUMN IF NOT EXISTS team1_score INTEGER,
  ADD COLUMN IF NOT EXISTS team2_score INTEGER;
