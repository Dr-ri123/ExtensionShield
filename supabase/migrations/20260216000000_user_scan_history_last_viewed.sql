-- Add last_viewed_at to user_scan_history so re-scanned extensions appear at top of scan history.
-- When a user views a previously scanned extension, we update last_viewed_at to bump it.

ALTER TABLE public.user_scan_history
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

-- Backfill: set last_viewed_at = created_at for existing rows (preserves original order)
UPDATE public.user_scan_history
SET last_viewed_at = created_at
WHERE last_viewed_at IS NULL;

-- Set default for new inserts
ALTER TABLE public.user_scan_history
  ALTER COLUMN last_viewed_at SET DEFAULT now();

-- Create index for ordering by last_viewed_at
CREATE INDEX IF NOT EXISTS user_scan_history_user_last_viewed_idx
  ON public.user_scan_history (user_id, last_viewed_at DESC);
