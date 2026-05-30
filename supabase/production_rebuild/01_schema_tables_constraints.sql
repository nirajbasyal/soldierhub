-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- REQUIRED SCHEMAS FOR EXTENSIONS
create schema if not exists extensions;
create schema if not exists vault;

-- EXTENSIONS
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists "uuid-ossp" with schema extensions;

-- SCHEMAS
create schema if not exists public;
grant usage on schema public to anon, authenticated, service_role;


-- CUSTOM TYPES
-- No custom public enum types found.

-- TABLES
create table if not exists public.comments (
  id uuid default uuid_generate_v4() not null,
  post_id uuid not null,
  author_id uuid not null,
  author_name_cached text,
  author_color_cached text,
  body text not null,
  created_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deleted_reason text
);

create table if not exists public.notifications (
  id uuid default uuid_generate_v4() not null,
  recipient_user_id uuid not null,
  actor_user_id uuid,
  actor_name_cached text,
  type text not null,
  post_id uuid,
  comment_id uuid,
  read boolean default false not null,
  created_at timestamp with time zone default now() not null,
  post_title_cached text
);

create table if not exists public.posts (
  id uuid default uuid_generate_v4() not null,
  author_id uuid not null,
  author_name_cached text,
  author_color_cached text,
  category text not null,
  body text default ''::text,
  anonymous boolean default false not null,
  status text default 'active'::text not null,
  edited boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
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
  upvote_count integer default 0 not null,
  comment_count integer default 0 not null,
  report_count integer default 0 not null
);

create table if not exists public.profile_follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.profiles (
  id uuid not null,
  full_name text not null,
  email text not null,
  bio text,
  avatar_color text default '#314A66'::text,
  avatar_url text,
  role text default 'user'::text not null,
  status text default 'pending'::text not null,
  base text default 'Fort Bliss'::text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  personal_email text,
  phone text,
  verification_status text default 'pending'::text not null
);

create table if not exists public.reports (
  post_id uuid not null,
  user_id uuid not null,
  reason text default ''::text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.resources (
  id uuid default gen_random_uuid() not null,
  section text not null,
  title text not null,
  description text,
  link text not null,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.upvotes (
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.visitor_reports (
  id uuid default uuid_generate_v4() not null,
  post_id uuid not null,
  visitor_key_hash text not null,
  reason text default ''::text,
  created_at timestamp with time zone default now() not null
);

-- CONSTRAINTS
-- Primary keys, unique constraints, and checks first.
alter table only public.comments add constraint comments_pkey PRIMARY KEY (id);
alter table only public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table only public.posts add constraint posts_comment_count_nonnegative CHECK ((comment_count >= 0));
alter table only public.posts add constraint posts_pkey PRIMARY KEY (id);
alter table only public.posts add constraint posts_report_count_nonnegative CHECK ((report_count >= 0));
alter table only public.posts add constraint posts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'reported'::text, 'removed'::text])));
alter table only public.posts add constraint posts_upvote_count_nonnegative CHECK ((upvote_count >= 0));
alter table only public.profile_follows add constraint profile_follows_no_self_follow CHECK ((follower_id <> following_id));
alter table only public.profile_follows add constraint profile_follows_pkey PRIMARY KEY (follower_id, following_id);
alter table only public.profiles add constraint profiles_email_key UNIQUE (email);
alter table only public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table only public.profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])));
alter table only public.profiles add constraint profiles_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'revoked'::text])));
alter table only public.profiles add constraint profiles_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'revoked'::text])));
alter table only public.reports add constraint reports_pkey PRIMARY KEY (post_id, user_id);
alter table only public.resources add constraint resources_pkey PRIMARY KEY (id);
alter table only public.upvotes add constraint upvotes_pkey PRIMARY KEY (post_id, user_id);
alter table only public.visitor_reports add constraint visitor_reports_pkey PRIMARY KEY (id);
alter table only public.visitor_reports add constraint visitor_reports_post_id_visitor_key_hash_key UNIQUE (post_id, visitor_key_hash);

-- Foreign keys second, after referenced primary/unique keys exist.
alter table only public.comments add constraint comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.comments add constraint comments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);
alter table only public.comments add constraint comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table only public.notifications add constraint notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.posts add constraint posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profile_follows add constraint profile_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profile_follows add constraint profile_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.reports add constraint reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.reports add constraint reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.upvotes add constraint upvotes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.upvotes add constraint upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.visitor_reports add constraint visitor_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

set check_function_bodies = on;

commit;
