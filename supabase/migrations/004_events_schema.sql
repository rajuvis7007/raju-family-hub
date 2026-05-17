-- ============================================================
-- Calendar events schema
-- ============================================================

create table if not exists public.events (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  event_date  date        not null,
  start_time  time,                   -- null = all-day
  end_time    time,
  member_id   text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists events_event_date_idx on public.events(event_date);

alter table public.events disable row level security;
