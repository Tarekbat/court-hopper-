-- Create settings table for app-wide configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  hero_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO public.settings (id)
VALUES ('app')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings
CREATE POLICY "Settings are publicly readable"
ON public.settings FOR SELECT
TO public
USING (true);

-- Policy: Only authenticated users can update settings (you may want to restrict this further)
CREATE POLICY "Authenticated users can update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

