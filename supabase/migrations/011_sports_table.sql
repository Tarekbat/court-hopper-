-- Sports/activity types: shared by groups, play-partners, and tournaments
-- Enables multi-sport (tennis, padel, pickleball) and future class types (yoga, pilates, etc.)

CREATE TABLE IF NOT EXISTS public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sports_slug ON public.sports(slug);
CREATE INDEX IF NOT EXISTS idx_sports_order ON public.sports("order");

-- Trigger for updated_at
CREATE TRIGGER update_sports_updated_at
  BEFORE UPDATE ON public.sports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: sports are public read-only
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sports are publicly readable"
  ON public.sports FOR SELECT USING (true);

-- Seed initial sports (tennis, padel, pickleball)
INSERT INTO public.sports (slug, name, icon, "order") VALUES
  ('tennis', 'Tennis', '🎾', 1),
  ('padel', 'Padel', '🏓', 2),
  ('pickleball', 'Pickleball', '🥒', 3)
ON CONFLICT (slug) DO NOTHING;
