-- Additive: cost model fields required by admin UX.

ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS cost_type TEXT NOT NULL DEFAULT 'pay_per_hour';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courts_cost_type_check'
  ) THEN
    ALTER TABLE public.courts
    ADD CONSTRAINT courts_cost_type_check
    CHECK (cost_type IN ('free', 'pay_per_hour', 'membership_required'));
  END IF;
END $$;

ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS cost_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_courts_cost_type ON public.courts(cost_type);

