-- Community review queue: items derived from scanned extensions, waiting for verification.
-- Votes (thumbs up/down) and notes from reviewers.

-- Queue items: one per finding/extension to verify (extension_id references scan_results.extension_id).
create table if not exists public.extension_review_queue (
  id uuid primary key default gen_random_uuid(),
  extension_id text not null,
  finding_type text not null default 'Security scan',
  severity text not null check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_review', 'verified', 'dismissed')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_extension_review_queue_extension_id on public.extension_review_queue(extension_id);
create index if not exists idx_extension_review_queue_status on public.extension_review_queue(status);
create index if not exists idx_extension_review_queue_created_at on public.extension_review_queue(created_at desc);

comment on table public.extension_review_queue is 'Items waiting for community verification; source is scanned extensions (scan_results).';

-- Votes: one per user per queue item (upsert by queue_item_id + user_id).
create table if not exists public.extension_review_votes (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.extension_review_queue(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote text not null check (vote in ('up', 'down')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique(queue_item_id, user_id)
);

create index if not exists idx_extension_review_votes_queue_item on public.extension_review_votes(queue_item_id);

comment on table public.extension_review_votes is 'Per-user vote (thumbs up/down) and optional note on a review queue item.';

-- Trigger to update updated_at on extension_review_queue
create trigger extension_review_queue_updated_at
  before update on public.extension_review_queue
  for each row
  execute function update_updated_at_column();

-- RLS: queue readable by all; insert/update for authenticated (claim, status updates).
alter table public.extension_review_queue enable row level security;

create policy "extension_review_queue_select"
  on public.extension_review_queue for select
  using (true);

create policy "extension_review_queue_insert"
  on public.extension_review_queue for insert
  with check (true);

create policy "extension_review_queue_update"
  on public.extension_review_queue for update
  using (true);

-- RLS: votes readable by all; insert/update for authenticated only.
alter table public.extension_review_votes enable row level security;

create policy "extension_review_votes_select"
  on public.extension_review_votes for select
  using (true);

create policy "extension_review_votes_insert"
  on public.extension_review_votes for insert
  with check (auth.uid() = user_id);

create policy "extension_review_votes_update"
  on public.extension_review_votes for update
  using (auth.uid() = user_id);

create policy "extension_review_votes_delete"
  on public.extension_review_votes for delete
  using (auth.uid() = user_id);
