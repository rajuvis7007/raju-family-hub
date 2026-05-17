-- Add media_type column to distinguish images from videos.
-- Existing rows default to 'image'.
alter table public.photos
  add column if not exists media_type text not null default 'image';
