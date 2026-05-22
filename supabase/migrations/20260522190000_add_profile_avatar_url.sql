-- Adds R2-backed profile photo support.
-- Safe to run multiple times in Supabase SQL Editor.

alter table public.profiles
add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
'Public URL for the member profile photo stored in Cloudflare R2.';
