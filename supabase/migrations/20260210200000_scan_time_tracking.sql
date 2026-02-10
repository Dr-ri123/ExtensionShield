-- Scan time tracking: first_scanned_at, previous_scanned_at, previous_scan_state
-- For accurate "recently scanned" display and Hot extensions analytics.

-- first_scanned_at: when extension was first scanned (set once, never updated)
alter table public.scan_results
  add column if not exists first_scanned_at timestamptz;

-- previous_scanned_at: when it was scanned before the last scan (for hot detection)
alter table public.scan_results
  add column if not exists previous_scanned_at timestamptz;

-- previous_scan_state: JSONB snapshot of metadata from previous scan for graphing Hot extensions
-- Structure: { user_count, rating, rating_count, scanned_at, total_findings, risk_level, ... }
alter table public.scan_results
  add column if not exists previous_scan_state jsonb;

comment on column public.scan_results.first_scanned_at is 'When extension was first scanned. Set once.';
comment on column public.scan_results.previous_scanned_at is 'When extension was scanned before the last scan. For hot-extension detection.';
comment on column public.scan_results.previous_scan_state is 'Snapshot of metadata from previous scan for graphing Hot extensions and data gathering.';
