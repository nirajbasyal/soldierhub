-- ============================================================================
-- Step 01 baseline core schema for Soldier Hub
-- ============================================================================
-- Purpose:
--   This migration makes supabase/migrations rebuildable from a brand-new
--   Supabase project.
--
-- Why this file exists:
--   Earlier database work was done manually in live Supabase and later captured
--   as hardening/patch migrations. Some older migrations expect the core tables
--   and helper functions to already exist. This baseline creates the core
--   objects first, then the existing timestamped migrations safely evolve the
--   database to the current production shape.
--
-- Production safety:
--   This file is intentionally idempotent. On an existing production database,
--   CREATE TABLE IF NOT EXISTS does not modify existing tables, and helper
--   functions/views/triggers are only created when missing.
--
-- Important:
--   The legacy public.profiles.status column is intentionally present in this
--   baseline because older historical migrations reference it. The later
--   migration 20260606203000_stage2c_drop_profiles_status.sql removes it, so a
--   fresh rebuild ends with verification_status as the only profile verification
--   source of truth.
-- ============================================================================

begin;

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- --------------------------------------------------------------------------
-- Core tables
-- --------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  bio text,
  avatar_color text not null default '#314A66',
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  base text default 'Fort Bliss',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  personal_email text,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'revoked')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected', 'revoked'))
);

create table if not exists public.posts (
  id uuid primary key default extensions.uuid_generate_v4(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name_cached text,
  author_color_cached text,
  category text not null constraint posts_category_allowed_check check (category in (
    'General Q&A',
    'PCS / Moving',
    'On-Base Guide',
    'Housing',
    'Barracks',
    'Local Recommendations',
    'Things to Do',
    'Finance',
    'Education',
    'Family / Spouse',
    'Resources',
    'Events & Community'
  )),
  body text default '',
  anonymous boolean not null default false,
  status text not null default 'active' check (status in ('active', 'reported', 'removed')),
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  image_url text,
  image_key text,
  image_width integer,
  image_height integer,
  image_size integer,
  image_thumbnail_url text,
  image_thumbnail_key text,
  image_thumbnail_width integer,
  image_thumbnail_height integer,
  image_thumbnail_size integer,
  moderation_status text not null default 'unreviewed' check (moderation_status in ('unreviewed', 'approved', 'degraded')),
  moderation_reason text,
  moderation_checked_at timestamptz,
  upvote_count integer not null default 0 check (upvote_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  report_count integer not null default 0 check (report_count >= 0)
);

create table if not exists public.comments (
  id uuid primary key default extensions.uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name_cached text,
  author_color_cached text,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_reason text
);

create table if not exists public.upvotes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint upvotes_pkey primary key (post_id, user_id)
);

create table if not exists public.reports (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text default '',
  created_at timestamptz not null default now(),
  constraint reports_pkey primary key (post_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default extensions.uuid_generate_v4(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name_cached text,
  type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  post_title_cached text
);

create table if not exists public.visitor_reports (
  id uuid primary key default extensions.uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_key_hash text not null,
  reason text default '',
  created_at timestamptz not null default now(),
  constraint visitor_reports_post_id_visitor_key_hash_key unique (post_id, visitor_key_hash)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  description text,
  link text not null,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_pkey primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

-- RLS enabled on all app tables. Later migrations create/refine policies.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.upvotes enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.visitor_reports enable row level security;
alter table public.resources enable row level security;
alter table public.profile_follows enable row level security;

-- --------------------------------------------------------------------------
-- Minimal helper functions required by historical policy migrations.
-- Later migrations replace/harden these definitions.
-- --------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_admin'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $fn$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        );
      $body$;
    $fn$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_verified_profile'
      and pg_get_function_identity_arguments(p.oid) = 'p_profile_id uuid'
  ) then
    execute $fn$
      create function public.is_verified_profile(p_profile_id uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.profiles p
          where p.id = p_profile_id
            and coalesce(p.status, p.verification_status) = 'verified'
        );
      $body$;
    $fn$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_verified'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $fn$
      create function public.is_verified()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select public.is_verified_profile(auth.uid());
      $body$;
    $fn$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'tg_set_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $fn$
      create function public.tg_set_updated_at()
      returns trigger
      language plpgsql
      as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$;
    $fn$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $fn$
      create function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        insert into public.profiles (
          id,
          full_name,
          email,
          avatar_color,
          base,
          role,
          status,
          verification_status
        ) values (
          new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'New member'),
          coalesce(new.email, ''),
          '#314A66',
          'Fort Bliss',
          'user',
          'pending',
          'pending'
        )
        on conflict (id) do nothing;

        return new;
      end;
      $body$;
    $fn$;
  end if;
end $$;

-- Auth signup trigger. Created only if missing.
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user()';
  end if;
end $$;

-- Updated-at triggers. Created only if missing.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    execute 'create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.tg_set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'posts_set_updated_at') then
    execute 'create trigger posts_set_updated_at before update on public.posts for each row execute function public.tg_set_updated_at()';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'resources_set_updated_at') then
    execute 'create trigger resources_set_updated_at before update on public.resources for each row execute function public.tg_set_updated_at()';
  end if;
end $$;

-- Minimal views required by historical grant statements.
-- Later migrations replace/harden these views and RPCs.

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'public_profiles'
  ) then
    execute $view$
      create view public.public_profiles
      with (security_invoker = true) as
      select
        p.id,
        p.full_name,
        p.avatar_color,
        p.avatar_url,
        p.base,
        p.created_at,
        p.verification_status
      from public.profiles p
      where coalesce(p.status, p.verification_status) = 'verified';
    $view$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profile_follow_counts'
  ) then
    execute $view$
      create view public.profile_follow_counts
      with (security_invoker = true) as
      select
        p.id as profile_id,
        count(distinct followers.follower_id) as followers_count,
        count(distinct following.following_id) as following_count
      from public.profiles p
      left join public.profile_follows followers on followers.following_id = p.id
      left join public.profile_follows following on following.follower_id = p.id
      group by p.id;
    $view$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'posts_with_meta'
  ) then
    execute $view$
      create view public.posts_with_meta
      with (security_invoker = true) as
      select
        p.*,
        0::bigint as upvote_count_view,
        0::bigint as comment_count_view,
        false as viewer_has_upvoted
      from public.posts p;
    $view$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'my_posts_with_meta'
  ) then
    execute $view$
      create view public.my_posts_with_meta
      with (security_invoker = true) as
      select
        p.*,
        0::bigint as upvote_count_view,
        0::bigint as comment_count_view,
        false as viewer_has_upvoted
      from public.posts p
      where p.author_id = auth.uid();
    $view$;
  end if;
end $$;

-- Minimal grants. Later migrations refine permissions and grants.
grant usage on schema public to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select on public.posts_with_meta to anon, authenticated;
grant select on public.my_posts_with_meta to authenticated;
grant select on public.profile_follow_counts to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.resources to anon, authenticated;

commit;
