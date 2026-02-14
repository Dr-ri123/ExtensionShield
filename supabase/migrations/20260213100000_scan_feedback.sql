-- Scan result feedback: per-scan user feedback (thumbs up/down + optional reason/score/comment)
-- Used for product analytics and model tuning.

create table if not exists public.scan_feedback (
  id uuid primary key default gen_random_uuid(),
  scan_id text not null,
  helpful boolean not null,
  reason text,
  suggested_score integer check (suggested_score is null or (suggested_score >= 0 and suggested_score <= 100)),
  comment text check (comment is null or char_length(comment) <= 280),
  user_id text,
  model_version text,
  ruleset_version text,
  created_at timestamptz default now() not null
);

create index if not exists idx_scan_feedback_scan_id on public.scan_feedback(scan_id);
create index if not exists idx_scan_feedback_created_at on public.scan_feedback(created_at desc);

comment on table public.scan_feedback is 'Per-scan user feedback on result helpfulness';
comment on column public.scan_feedback.scan_id is 'Extension ID or slug';
comment on column public.scan_feedback.helpful is 'True = thumbs up, false = thumbs down';
comment on column public.scan_feedback.reason is 'false_positive|false_negative|score_off|unclear|other (when helpful=false)';
comment on column public.scan_feedback.suggested_score is 'User suggested score 0-100 (optional)';
comment on column public.scan_feedback.comment is 'Optional free-text, max 280 chars';

alter table public.scan_feedback enable row level security;
