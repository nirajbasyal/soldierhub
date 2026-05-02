-- ============================================================================
-- Soldier Hub — Database Schema
-- ============================================================================
-- Run this in the Supabase SQL Editor. Tables will be created in the public
-- schema. Run policies.sql AFTER this file. Run seed.sql LAST (optional).
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── profiles ──────────────────────────────────────────────────────────────
-- Extends auth.users with app-specific profile data.
create table if not exists public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  full_name     text not null,
  email         text unique not null,
  bio           text,
  avatar_color  text default '#314A66',
  avatar_url    text,
  role          text not null default 'user'      check (role in ('user', 'admin')),
  status        text not null default 'pending'   check (status in ('pending', 'verified', 'rejected')),
  base          text default 'Fort Bliss',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx   on public.profiles(role);

-- ─── posts ─────────────────────────────────────────────────────────────────
-- Author display fields are denormalized (author_name_cached, author_color_cached)
-- and populated by a trigger. This is intentional:
--   1. Privacy: the feed never needs to join `profiles`, so anonymous browsing
--      doesn't expose author emails or other private fields.
--   2. Anonymity: when `anonymous = true`, the cached fields are blanked, so
--      "Anonymous Soldier" really is anonymous at the API level — not just in
--      the UI.
--   3. Performance: feed reads don't pay for a join on every row.
create table if not exists public.posts (
  id                    uuid primary key default uuid_generate_v4(),
  author_id             uuid not null references public.profiles(id) on delete cascade,
  author_name_cached    text,
  author_color_cached   text,
  category              text not null,
  title                 text not null,
  body                  text default '',
  anonymous             boolean not null default false,
  status                text not null default 'active'    check (status in ('active', 'reported', 'removed')),
  edited                boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists posts_created_idx   on public.posts(created_at desc);
create index if not exists posts_status_idx    on public.posts(status);
create index if not exists posts_category_idx  on public.posts(category);
create index if not exists posts_author_idx    on public.posts(author_id);

-- ─── comments ──────────────────────────────────────────────────────────────
-- Same denormalization pattern as posts — author display fields are cached so
-- comment reads never need to join `profiles`.
create table if not exists public.comments (
  id                    uuid primary key default uuid_generate_v4(),
  post_id               uuid not null references public.posts(id) on delete cascade,
  author_id             uuid not null references public.profiles(id) on delete cascade,
  author_name_cached    text,
  author_color_cached   text,
  body                  text not null,
  created_at            timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments(post_id, created_at);

create or replace function public.tg_cache_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pname  text;
  pcolor text;
begin
  select full_name, avatar_color into pname, pcolor
  from public.profiles where id = new.author_id;

  new.author_name_cached  := pname;
  new.author_color_cached := pcolor;

  return new;
end $$;

drop trigger if exists comments_cache_author on public.comments;
create trigger comments_cache_author
  before insert on public.comments
  for each row execute procedure public.tg_cache_comment_author();

-- ─── upvotes ───────────────────────────────────────────────────────────────
-- Composite primary key: each (user, post) pair can only exist once.
create table if not exists public.upvotes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists upvotes_post_idx on public.upvotes(post_id);

-- ─── reports ───────────────────────────────────────────────────────────────
create table if not exists public.reports (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reason     text default '',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists reports_post_idx on public.reports(post_id);

-- ─── notifications ─────────────────────────────────────────────────────────
-- actor_name_cached cached at insert time so reads don't need to join profiles.
create table if not exists public.notifications (
  id                  uuid primary key default uuid_generate_v4(),
  recipient_user_id   uuid not null references public.profiles(id) on delete cascade,
  actor_user_id       uuid references public.profiles(id) on delete set null,
  actor_name_cached   text,
  type                text not null,
  post_id             uuid references public.posts(id) on delete cascade,
  post_title_cached   text,
  comment_id          uuid references public.comments(id) on delete cascade,
  read                boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);
create index if not exists notifications_unread_idx    on public.notifications(recipient_user_id, read);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ─── Auto-update updated_at on profiles and posts ──────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.tg_set_updated_at();

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.tg_set_updated_at();

-- ─── Cache author display fields on insert / when anonymous changes ────────
-- This makes the feed safe to expose without joining `profiles`.
-- When `anonymous = true`, cached fields are blanked so the author's identity
-- does not leak through the public feed view.
create or replace function public.tg_cache_author_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pname  text;
  pcolor text;
begin
  if new.anonymous then
    new.author_name_cached  := null;
    new.author_color_cached := null;
  else
    select full_name, avatar_color into pname, pcolor
    from public.profiles where id = new.author_id;

    new.author_name_cached  := pname;
    new.author_color_cached := pcolor;
  end if;

  return new;
end $$;

drop trigger if exists posts_cache_author on public.posts;
create trigger posts_cache_author
  before insert or update of anonymous, author_id on public.posts
  for each row execute procedure public.tg_cache_author_fields();

-- ─── Auto-create profile when a new auth user signs up ─────────────────────
-- New profiles default to status='pending' and role='user'.
-- The Niraj admin account is whitelisted and auto-verified.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_role   text;
  new_status text;
begin
  if new.email = 'niraj.basyal2054@gmail.com' then
    new_role := 'admin';
    new_status := 'verified';
  else
    new_role := 'user';
    new_status := 'pending';
  end if;

  insert into public.profiles (id, full_name, email, bio, avatar_color, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'bio', ''),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#314A66'),
    new_role,
    new_status
  )
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Mark post as 'reported' once it has any reports ───────────────────────
create or replace function public.tg_mark_post_reported()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.posts
  set status = 'reported'
  where id = new.post_id
    and status = 'active';

  return new;
end $$;

drop trigger if exists report_marks_post on public.reports;
create trigger report_marks_post
  after insert on public.reports
  for each row execute procedure public.tg_mark_post_reported();

-- ─── Notify post author when someone commented ────────────────────────────
-- Caches actor_name and post_title at insert time so the recipient can read
-- their notifications without joining `profiles`.
create or replace function public.tg_notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author      uuid;
  post_title_local text;
  actor_name_local text;
begin
  select author_id, title into post_author, post_title_local
  from public.posts
  where id = new.post_id;

  -- Don't notify yourself
  if post_author is null or post_author = new.author_id then
    return new;
  end if;

  select full_name into actor_name_local
  from public.profiles
  where id = new.author_id;

  insert into public.notifications
    (recipient_user_id, actor_user_id, actor_name_cached, type, post_id, post_title_cached, comment_id)
  values
    (post_author, new.author_id, actor_name_local, 'comment', new.post_id, post_title_local, new.id);

  return new;
end $$;

drop trigger if exists comment_creates_notification on public.comments;
create trigger comment_creates_notification
  after insert on public.comments
  for each row execute procedure public.tg_notify_on_comment();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Public feed view — uses cached author fields and never exposes profile email.
-- SECURITY INVOKER is enabled so Supabase RLS/security checks apply as the querying user.
-- The view masks anonymous data:
--   - author_id is NULL when anonymous
--   - author_name and author_color are NULL when anonymous
create or replace view public.posts_with_meta
with (security_invoker = true) as
select
  p.id,
  case when p.anonymous then null else p.author_id end as author_id,
  p.category,
  p.title,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  case when p.anonymous then null else p.author_name_cached end  as author_name,
  case when p.anonymous then null else p.author_color_cached end as author_color,
  coalesce((select count(*) from public.upvotes  u where u.post_id = p.id), 0) as upvote_count,
  coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
  coalesce((select count(*) from public.reports  r where r.post_id = p.id), 0) as report_count
from public.posts p
where p.status in ('active', 'reported');

-- Same shape as posts_with_meta, but does NOT mask author identity.
-- Used by the profile page so users can see and edit their own anonymous posts.
-- SECURITY INVOKER is enabled so RLS on the underlying posts table applies.
create or replace view public.my_posts_with_meta
with (security_invoker = true) as
select
  p.id,
  p.author_id,
  p.category,
  p.title,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  p.author_name_cached  as author_name,
  p.author_color_cached as author_color,
  coalesce((select count(*) from public.upvotes  u where u.post_id = p.id), 0) as upvote_count,
  coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
  coalesce((select count(*) from public.reports  r where r.post_id = p.id), 0) as report_count
from public.posts p;

-- Public-safe profile view. Excludes email, role, and status.
-- SECURITY INVOKER is enabled so Supabase RLS/security checks apply as the querying user.
-- Only verified users' safe public profile fields are exposed.
create or replace view public.public_profiles
with (security_invoker = true) as
select
  id,
  full_name,
  bio,
  avatar_color,
  avatar_url,
  base,
  created_at
from public.profiles
where status = 'verified';

-- ============================================================================
-- GRANTS
-- ============================================================================

grant select on public.posts_with_meta to anon, authenticated;
grant select on public.my_posts_with_meta to authenticated;
grant select on public.public_profiles to anon, authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
-- Next: run policies.sql to enable Row Level Security.