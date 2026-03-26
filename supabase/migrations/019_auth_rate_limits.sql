-- Production readiness: rate limiting / lockout for auth endpoints
-- Additive only (no destructive changes)

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  kind TEXT NOT NULL CHECK (kind IN ('signin', 'signup')),
  identifier TEXT NOT NULL,
  ip TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, identifier, ip)
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until
  ON public.auth_rate_limits (blocked_until)
  WHERE blocked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_updated_at
  ON public.auth_rate_limits (updated_at);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct client access; server uses service role.
REVOKE ALL ON TABLE public.auth_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.auth_check_and_increment(
  p_kind TEXT,
  p_identifier TEXT,
  p_ip TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 900,
  p_block_seconds INTEGER DEFAULT 900
)
RETURNS TABLE (
  allowed BOOLEAN,
  attempts INTEGER,
  remaining INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_row public.auth_rate_limits%ROWTYPE;
  v_window_start TIMESTAMPTZ;
  v_retry_after INTEGER;
BEGIN
  IF p_kind IS NULL OR p_identifier IS NULL OR p_ip IS NULL THEN
    RAISE EXCEPTION 'kind, identifier, and ip are required';
  END IF;

  -- Normalize inputs a bit to reduce key explosion
  p_kind := lower(trim(p_kind));
  p_identifier := lower(trim(p_identifier));
  p_ip := trim(p_ip);

  IF p_kind NOT IN ('signin', 'signup') THEN
    RAISE EXCEPTION 'invalid kind %', p_kind;
  END IF;

  -- Lock the row to make increments atomic.
  SELECT *
  INTO v_row
  FROM public.auth_rate_limits
  WHERE kind = p_kind AND identifier = p_identifier AND ip = p_ip
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.auth_rate_limits (kind, identifier, ip, window_started_at, attempts, blocked_until, updated_at)
    VALUES (p_kind, p_identifier, p_ip, v_now, 0, NULL, v_now)
    RETURNING * INTO v_row;
  END IF;

  IF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    v_retry_after := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_row.blocked_until - v_now)))::INT);
    RETURN QUERY SELECT false, v_row.attempts, 0, v_retry_after;
    RETURN;
  END IF;

  v_window_start := v_row.window_started_at;
  IF v_window_start < (v_now - make_interval(secs => p_window_seconds)) THEN
    v_window_start := v_now;
    v_row.attempts := 0;
  END IF;

  v_row.attempts := v_row.attempts + 1;

  IF v_row.attempts >= p_max_attempts THEN
    v_row.blocked_until := v_now + make_interval(secs => p_block_seconds);
    UPDATE public.auth_rate_limits
      SET window_started_at = v_window_start,
          attempts = v_row.attempts,
          blocked_until = v_row.blocked_until,
          updated_at = v_now
      WHERE kind = p_kind AND identifier = p_identifier AND ip = p_ip;

    RETURN QUERY SELECT false, v_row.attempts, 0, p_block_seconds;
    RETURN;
  END IF;

  UPDATE public.auth_rate_limits
    SET window_started_at = v_window_start,
        attempts = v_row.attempts,
        blocked_until = NULL,
        updated_at = v_now
    WHERE kind = p_kind AND identifier = p_identifier AND ip = p_ip;

  RETURN QUERY SELECT true, v_row.attempts, (p_max_attempts - v_row.attempts), 0;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_check_and_increment(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM anon, authenticated;

