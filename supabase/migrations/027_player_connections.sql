-- Social graph: connection requests and accepted connections

CREATE TABLE IF NOT EXISTS public.player_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  acted_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_connections_unique_pair
  ON public.player_connections (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
CREATE INDEX IF NOT EXISTS idx_player_connections_requester
  ON public.player_connections(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_player_connections_recipient
  ON public.player_connections(recipient_id, status);

CREATE TRIGGER update_player_connections_updated_at
  BEFORE UPDATE ON public.player_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.player_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own connections"
  ON public.player_connections FOR SELECT TO authenticated
  USING (requester_id = auth.uid()::text OR recipient_id = auth.uid()::text);

CREATE POLICY "Users create connection requests"
  ON public.player_connections FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid()::text);

CREATE POLICY "Requester or recipient update connection"
  ON public.player_connections FOR UPDATE TO authenticated
  USING (requester_id = auth.uid()::text OR recipient_id = auth.uid()::text)
  WITH CHECK (requester_id = auth.uid()::text OR recipient_id = auth.uid()::text);
