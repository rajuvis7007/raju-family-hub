-- ============================================================
-- Raju Family Dashboard — Photos feature schema
-- Run via: supabase db push  (or paste into the SQL editor)
-- ============================================================

-- Ensure the pgcrypto extension is available for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- albums
-- ----------------------------------------------------------
create table if not exists public.albums (
  id                   uuid        primary key default gen_random_uuid(),
  title                text        not null,
  description          text,
  event_date           date,
  created_by_member_id text        not null,   -- e.g. 'raju', 'joshna'
  cover_photo_url      text,                   -- auto-updated on first/latest upload
  created_at           timestamptz not null default now()
);

-- ----------------------------------------------------------
-- photos
-- ----------------------------------------------------------
create table if not exists public.photos (
  id                    uuid        primary key default gen_random_uuid(),
  album_id              uuid        not null references public.albums(id) on delete cascade,
  storage_url           text        not null,  -- full public CDN URL
  uploaded_by_member_id text        not null,  -- e.g. 'amrita'
  created_at            timestamptz not null default now()
);

-- Indexes for fast per-album queries and chronological sorting
create index if not exists photos_album_id_idx   on public.photos(album_id);
create index if not exists photos_created_at_idx on public.photos(created_at desc);
create index if not exists albums_created_at_idx on public.albums(created_at desc);

-- ----------------------------------------------------------
-- Row Level Security
-- Disabled for this family app (no auth required).
-- Enable and add policies before making the app public.
-- ----------------------------------------------------------
alter table public.albums disable row level security;
alter table public.photos disable row level security;

-- ----------------------------------------------------------
-- Storage bucket setup
-- Run this ONCE, or create the bucket manually in the
-- Supabase dashboard (Storage → New bucket → name: "photos",
-- Public bucket: ON).
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
