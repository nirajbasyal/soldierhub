-- ============================================================================
-- Soldier Hub production_rebuild.sql
-- Generated from the current live Supabase database.
-- Purpose: rebuild Soldier Hub database structure from scratch in a NEW Supabase project.
--
-- IMPORTANT:
-- 1. Run this only on a brand-new empty Supabase project.
-- 2. This rebuilds database structure, functions, triggers, RLS policies, grants,
--    indexes, views, and public.resources seed rows.
-- 3. This does NOT copy real users, posts, comments, reports, notifications, or auth accounts.
-- 4. Supabase Auth settings, Resend SMTP, Vercel env vars, R2, Upstash/KV, and Sentry
--    must still be configured in their dashboards.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;


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
alter table only public.comments add constraint comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.comments add constraint comments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);
alter table only public.comments add constraint comments_pkey PRIMARY KEY (id);
alter table only public.comments add constraint comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table only public.notifications add constraint notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table only public.notifications add constraint notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.posts add constraint posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.posts add constraint posts_comment_count_nonnegative CHECK ((comment_count >= 0));
alter table only public.posts add constraint posts_pkey PRIMARY KEY (id);
alter table only public.posts add constraint posts_report_count_nonnegative CHECK ((report_count >= 0));
alter table only public.posts add constraint posts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'reported'::text, 'removed'::text])));
alter table only public.posts add constraint posts_upvote_count_nonnegative CHECK ((upvote_count >= 0));
alter table only public.profile_follows add constraint profile_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profile_follows add constraint profile_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profile_follows add constraint profile_follows_no_self_follow CHECK ((follower_id <> following_id));
alter table only public.profile_follows add constraint profile_follows_pkey PRIMARY KEY (follower_id, following_id);
alter table only public.profiles add constraint profiles_email_key UNIQUE (email);
alter table only public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table only public.profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])));
alter table only public.profiles add constraint profiles_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'revoked'::text])));
alter table only public.profiles add constraint profiles_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'revoked'::text])));
alter table only public.reports add constraint reports_pkey PRIMARY KEY (post_id, user_id);
alter table only public.reports add constraint reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.reports add constraint reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.resources add constraint resources_pkey PRIMARY KEY (id);
alter table only public.upvotes add constraint upvotes_pkey PRIMARY KEY (post_id, user_id);
alter table only public.upvotes add constraint upvotes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.upvotes add constraint upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.visitor_reports add constraint visitor_reports_pkey PRIMARY KEY (id);
alter table only public.visitor_reports add constraint visitor_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table only public.visitor_reports add constraint visitor_reports_post_id_visitor_key_hash_key UNIQUE (post_id, visitor_key_hash);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.admin_list_profiles(p_queue text DEFAULT 'pending'::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, full_name text, email text, personal_email text, phone text, bio text, avatar_color text, avatar_url text, role text, status text, verification_status text, base text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                  declare
                                    v_queue text := lower(trim(coalesce(p_queue, 'pending')));
                                      v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
                                      begin
                                        if auth.uid() is null then
                                            raise exception 'Please log in again before loading admin profiles.';
                                              end if;

                                                if not public.is_admin() then
                                                    raise exception 'Admin access is required to load profile queues.';
                                                      end if;

                                                        if v_queue not in ('pending', 'verified', 'blocked') then
                                                            raise exception 'Invalid admin profile queue.';
                                                              end if;

                                                                return query
                                                                  select
                                                                      p.id,
                                                                          p.full_name,
                                                                              p.email,
                                                                                  p.personal_email,
                                                                                      p.phone,
                                                                                          p.bio,
                                                                                              p.avatar_color,
                                                                                                  p.avatar_url,
                                                                                                      p.role,
                                                                                                          p.status,
                                                                                                              p.verification_status,
                                                                                                                  p.base,
                                                                                                                      p.created_at,
                                                                                                                          p.updated_at
                                                                                                                            from public.profiles p
                                                                                                                              where
                                                                                                                                  (v_queue = 'pending' and p.status = 'pending')
                                                                                                                                      or (v_queue = 'verified' and p.status = 'verified')
                                                                                                                                          or (v_queue = 'blocked' and p.status in ('rejected', 'revoked'))
                                                                                                                                            order by p.created_at desc, p.id desc
                                                                                                                                              limit v_limit;
                                                                                                                                              end;
                                                                                                                                              $function$;


CREATE OR REPLACE FUNCTION public.admin_reject_profile(p_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject profiles.';
  end if;

  update public.profiles
  set
    status = 'rejected',
    verification_status = 'rejected',
    updated_at = now()
  where id = p_profile_id
    and status = 'pending'
    and verification_status = 'pending';
end;
$function$;


CREATE OR REPLACE FUNCTION public.admin_revoke_profile(p_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke profiles.';
  end if;

  update public.profiles
  set
    status = 'revoked',
    verification_status = 'revoked',
    updated_at = now()
  where id = p_profile_id
    and status = 'verified'
    and verification_status = 'verified';
end;
$function$;


CREATE OR REPLACE FUNCTION public.admin_revoke_profile_by_email(p_email text)
 RETURNS TABLE(id uuid, email text, personal_email text, full_name text, status text, verification_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke profiles.';
  end if;

  return query
  update public.profiles
  set
    status = 'revoked',
    verification_status = 'revoked'
  where (
      lower(coalesce(profiles.email, profiles.personal_email)) = lower(p_email)
      or lower(profiles.personal_email) = lower(p_email)
    )
    and coalesce(profiles.role, 'user') <> 'admin'
  returning
    profiles.id,
    profiles.email,
    profiles.personal_email,
    profiles.full_name,
    profiles.status,
    profiles.verification_status;
end;
$function$;


CREATE OR REPLACE FUNCTION public.admin_verify_profile_by_email(p_email text)
 RETURNS TABLE(id uuid, email text, personal_email text, full_name text, status text, verification_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only admins can verify profiles.';
  end if;

  return query
  update public.profiles
  set
    status = 'verified',
    verification_status = 'verified'
  where lower(coalesce(profiles.email, profiles.personal_email)) = lower(p_email)
     or lower(profiles.personal_email) = lower(p_email)
  returning
    profiles.id,
    profiles.email,
    profiles.personal_email,
    profiles.full_name,
    profiles.status,
    profiles.verification_status;
end;
$function$;


CREATE OR REPLACE FUNCTION public.count_post_reports(p_post_id uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce((select count(*) from public.reports r where r.post_id = p_post_id), 0)
    +
    coalesce((select count(*) from public.visitor_reports vr where vr.post_id = p_post_id), 0);
$function$;


CREATE OR REPLACE FUNCTION public.create_comment_safe(p_post_id uuid, p_body text)
 RETURNS TABLE(id uuid, comment_id uuid, post_id uuid, body text, created_at timestamp with time zone, author_id uuid, author_user_id uuid, author_name_cached text, author_color_cached text, author_avatar_url text, author_avatar_url_cached text, profile_avatar_url text, avatar_url text, is_anonymous_author boolean, viewer_is_author boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          DECLARE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            v_user_id uuid := auth.uid();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              v_comment_id uuid;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                IF v_user_id IS NULL THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RAISE EXCEPTION 'You must be logged in to comment.';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        IF NOT EXISTS (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            SELECT 1
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                FROM public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    WHERE p.id = v_user_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          AND COALESCE(p.status, p.verification_status, 'pending') = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ) THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                RAISE EXCEPTION 'Your profile must be verified before you can comment.';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    IF p_post_id IS NULL THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RAISE EXCEPTION 'Post was not identified.';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            IF p_body IS NULL OR LENGTH(TRIM(p_body)) = 0 THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                RAISE EXCEPTION 'Please write a comment before posting.';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    IF LENGTH(TRIM(p_body)) > 2000 THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RAISE EXCEPTION 'Comment must be 2000 characters or less.';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            INSERT INTO public.comments (post_id, author_id, body)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              VALUES (p_post_id, v_user_id, TRIM(p_body))
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                RETURNING comments.id INTO v_comment_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  RETURN QUERY
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    SELECT gc.*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      FROM public.get_public_comments_for_post(p_post_id, 100) gc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        WHERE gc.id = v_comment_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        $function$;


CREATE OR REPLACE FUNCTION public.create_follow_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      declare
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        v_actor_name text;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        begin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          if new.follower_id is null
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               or new.following_id is null
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    or new.follower_id = new.following_id then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        return new;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          end if;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            select coalesce(p.full_name, 'Someone')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              into v_actor_name
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                from public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  where p.id = new.follower_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    insert into public.notifications (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        recipient_user_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            actor_user_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                actor_name_cached,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    type,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        post_title_cached,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            read,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                created_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    values (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        new.following_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            new.follower_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                coalesce(v_actor_name, 'Someone'),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'follow',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        'followed your profile',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            false,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                now()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    on conflict do nothing;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      update public.notifications
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        set
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            read = false,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                actor_name_cached = coalesce(v_actor_name, 'Someone'),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    post_title_cached = 'followed your profile',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        created_at = now()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          where recipient_user_id = new.following_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              and actor_user_id = new.follower_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  and type = 'follow';

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    return new;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    $function$;


CREATE OR REPLACE FUNCTION public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_hash text;
  v_inserted int;
begin
  if p_post_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing post id.');
  end if;

  if p_visitor_key is null or length(trim(p_visitor_key)) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Missing visitor key.');
  end if;

  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and status in ('active', 'reported')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Post not found.');
  end if;

  v_hash := encode(
    extensions.digest(convert_to(trim(p_visitor_key), 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.visitor_reports (post_id, visitor_key_hash, reason)
  values (
    p_post_id,
    v_hash,
    left(coalesce(p_reason, ''), 500)
  )
  on conflict (post_id, visitor_key_hash) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.posts
    set status = 'reported'
    where id = p_post_id
      and status = 'active';
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_reported', v_inserted = 0
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.delete_comment_safe(p_comment_id uuid)
 RETURNS TABLE(ok boolean, deleted_comment_id uuid, affected_post_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_comment record;
  v_is_verified boolean := false;
  v_is_admin boolean := false;
begin
  if v_user_id is null then
    raise exception 'Please log in again before deleting this comment.'
      using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.status = 'verified'
      and p.verification_status = 'verified'
  )
  into v_is_verified;

  if not v_is_verified then
    raise exception 'Your profile must be verified before deleting comments.'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'admin'
      and p.status = 'verified'
      and p.verification_status = 'verified'
  )
  into v_is_admin;

  select c.id, c.post_id, c.author_id, c.deleted_at
  into v_comment
  from public.comments c
  where c.id = p_comment_id
  for update;

  if not found then
    raise exception 'This comment no longer exists.'
      using errcode = 'P0002';
  end if;

  if v_comment.deleted_at is not null then
    return query select true, v_comment.id, v_comment.post_id;
    return;
  end if;

  if v_comment.author_id <> v_user_id and not v_is_admin then
    raise exception 'You can only delete your own comment.'
      using errcode = '42501';
  end if;

  update public.comments
  set
    deleted_at = now(),
    deleted_by = v_user_id,
    deleted_reason = case
      when v_is_admin and v_comment.author_id <> v_user_id then 'admin_deleted'
      else 'user_deleted'
    end,
    body = '[deleted]'
  where id = p_comment_id
    and deleted_at is null;

  delete from public.notifications
  where comment_id = p_comment_id;

  return query select true, v_comment.id, v_comment.post_id;
end;
$function$;


CREATE OR REPLACE FUNCTION public.delete_own_post(p_post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  deleted_count integer := 0;
begin
  if auth.uid() is null then
    return false;
  end if;

  delete from public.posts p
  where p.id = p_post_id
    and (
      p.author_id = auth.uid()
      or public.is_admin()
    );

  get diagnostics deleted_count = row_count;

  return deleted_count > 0;
end;
$function$;


CREATE OR REPLACE FUNCTION public.delete_post(p_post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_author_id uuid;
begin
  select author_id
  into v_author_id
  from public.posts
  where id = p_post_id;

  if v_author_id is null then
    return;
  end if;

  if auth.uid() <> v_author_id and not public.is_admin() then
    raise exception 'You do not have permission to delete this post.';
  end if;

  delete from public.notifications where post_id = p_post_id;
  delete from public.comments where post_id = p_post_id;
  delete from public.reports where post_id = p_post_id;
  delete from public.upvotes where post_id = p_post_id;
  delete from public.posts where id = p_post_id;
end;
$function$;


CREATE OR REPLACE FUNCTION public.find_verified_profile_by_email(p_email text)
 RETURNS TABLE(id uuid, full_name text, avatar_color text, avatar_url text, base text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                  declare
                    clean_email text := lower(trim(coalesce(p_email, '')));
                    begin
                      if auth.uid() is null then
                          raise exception 'Please sign in before searching member profiles.';
                            end if;

                              if not public.is_verified_profile(auth.uid()) then
                                  raise exception 'Verified account required to search member profiles.';
                                    end if;

                                      if clean_email = '' or position('@' in clean_email) = 0 then
                                          return;
                                            end if;

                                              return query
                                                  select
                                                        p.id,
                                                              coalesce(p.full_name, 'SoldierHub member')::text as full_name,
                                                                    coalesce(p.avatar_color, '#314A66')::text as avatar_color,
                                                                          p.avatar_url::text as avatar_url,
                                                                                coalesce(p.base, 'Fort Bliss')::text as base
                                                                                    from public.profiles p
                                                                                        where p.status = 'verified'
                                                                                              and p.verification_status = 'verified'
                                                                                                    and (
                                                                                                            lower(coalesce(p.email, '')) = clean_email
                                                                                                                    or lower(coalesce(p.personal_email, '')) = clean_email
                                                                                                                          )
                                                                                                                              order by p.updated_at desc nulls last, p.created_at desc nulls last
                                                                                                                                  limit 1;
                                                                                                                                  end;
                                                                                                                                  $function$;


CREATE OR REPLACE FUNCTION public.get_anonymous_post_label(p_post_id uuid)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select 'Anonymous' ||
    lpad(
      (
        coalesce(
          (
            select sum(ascii(substr(p_post_id::text, i, 1)) * i)
            from generate_series(1, length(p_post_id::text)) as s(i)
          ),
          0
        )::bigint % 10000
      )::text,
      4,
      '0'
    );
$function$;


CREATE OR REPLACE FUNCTION public.get_latest_public_post_marker()
 RETURNS TABLE(id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
      SELECT
          p.id,
              p.created_at
                FROM public.posts p
                  WHERE p.status IN ('active', 'reported')
                    ORDER BY p.created_at DESC, p.id DESC
                      LIMIT 1;
                      $function$;


CREATE OR REPLACE FUNCTION public.get_my_feed_viewer_state(p_post_ids uuid[])
 RETURNS TABLE(upvoted_post_ids uuid[], reported_post_ids uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
      with safe_input as (
          select array(
                select distinct post_id
                      from unnest(coalesce(p_post_ids, array[]::uuid[])) as input(post_id)
                            where post_id is not null
                                  limit 100
                                      ) as post_ids
                                        )
                                          select
                                              coalesce(
                                                    array(
                                                            select distinct u.post_id
                                                                    from public.upvotes u
                                                                            cross join safe_input si
                                                                                    where auth.uid() is not null
                                                                                              and u.user_id = auth.uid()
                                                                                                        and u.post_id = any(si.post_ids)
                                                                                                              ),
                                                                                                                    array[]::uuid[]
                                                                                                                        ) as upvoted_post_ids,
                                                                                                                            coalesce(
                                                                                                                                  array(
                                                                                                                                          select distinct r.post_id
                                                                                                                                                  from public.reports r
                                                                                                                                                          cross join safe_input si
                                                                                                                                                                  where auth.uid() is not null
                                                                                                                                                                            and r.user_id = auth.uid()
                                                                                                                                                                                      and r.post_id = any(si.post_ids)
                                                                                                                                                                                            ),
                                                                                                                                                                                                  array[]::uuid[]
                                                                                                                                                                                                      ) as reported_post_ids;
                                                                                                                                                                                                      $function$;


CREATE OR REPLACE FUNCTION public.get_profile_follow_summary(p_profile_id uuid)
 RETURNS TABLE(profile_id uuid, followers_count bigint, following_count bigint, is_following boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                  with target_profile as (
                      select p.id
                          from public.profiles p
                              where p.id = p_profile_id
                                    and p.status = 'verified'
                                          and p.verification_status = 'verified'
                                              limit 1
                                                )
                                                  select
                                                      target_profile.id as profile_id,
                                                          coalesce((
                                                                select count(*)
                                                                      from public.profile_follows pf
                                                                            where pf.following_id = target_profile.id
                                                                                    and exists (
                                                                                              select 1
                                                                                                        from public.profiles follower_profile
                                                                                                                  where follower_profile.id = pf.follower_id
                                                                                                                              and follower_profile.status = 'verified'
                                                                                                                                          and follower_profile.verification_status = 'verified'
                                                                                                                                                  )
                                                                                                                                                      ), 0)::bigint as followers_count,
                                                                                                                                                          coalesce((
                                                                                                                                                                select count(*)
                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                            where pf.follower_id = target_profile.id
                                                                                                                                                                                    and exists (
                                                                                                                                                                                              select 1
                                                                                                                                                                                                        from public.profiles following_profile
                                                                                                                                                                                                                  where following_profile.id = pf.following_id
                                                                                                                                                                                                                              and following_profile.status = 'verified'
                                                                                                                                                                                                                                          and following_profile.verification_status = 'verified'
                                                                                                                                                                                                                                                  )
                                                                                                                                                                                                                                                      ), 0)::bigint as following_count,
                                                                                                                                                                                                                                                          case
                                                                                                                                                                                                                                                                when auth.uid() is null or auth.uid() = target_profile.id then false
                                                                                                                                                                                                                                                                      else exists (
                                                                                                                                                                                                                                                                              select 1
                                                                                                                                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                                                                                                                                              where pf.follower_id = auth.uid()
                                                                                                                                                                                                                                                                                                        and pf.following_id = target_profile.id
                                                                                                                                                                                                                                                                                                              )
                                                                                                                                                                                                                                                                                                                  end as is_following
                                                                                                                                                                                                                                                                                                                    from target_profile;
                                                                                                                                                                                                                                                                                                                    $function$;


CREATE OR REPLACE FUNCTION public.get_public_comments_for_post(target_post_id uuid, limit_count integer DEFAULT 50)
 RETURNS TABLE(id uuid, comment_id uuid, post_id uuid, body text, created_at timestamp with time zone, author_id uuid, author_user_id uuid, author_name_cached text, author_color_cached text, author_avatar_url text, author_avatar_url_cached text, profile_avatar_url text, avatar_url text, is_anonymous_author boolean, viewer_is_author boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                    SELECT
                                        c.id,
                                            c.id AS comment_id,
                                                c.post_id,
                                                    c.body,
                                                        c.created_at,
                                                            CASE
                                                                  WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
                                                                        ELSE c.author_id
                                                                            END AS author_id,
                                                                                CASE
                                                                                      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
                                                                                            ELSE c.author_id
                                                                                                END AS author_user_id,
                                                                                                    CASE
                                                                                                          WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN 'Anonymous'
                                                                                                                ELSE COALESCE(pr.full_name, 'Member')
                                                                                                                    END AS author_name_cached,
                                                                                                                        CASE
                                                                                                                              WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN '#5C6470'
                                                                                                                                    ELSE pr.avatar_color
                                                                                                                                        END AS author_color_cached,
                                                                                                                                            CASE
                                                                                                                                                  WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
                                                                                                                                                        ELSE pr.avatar_url
                                                                                                                                                            END AS author_avatar_url,
                                                                                                                                                                CASE
                                                                                                                                                                      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
                                                                                                                                                                            ELSE pr.avatar_url
                                                                                                                                                                                END AS author_avatar_url_cached,
                                                                                                                                                                                    CASE
                                                                                                                                                                                          WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
                                                                                                                                                                                                ELSE pr.avatar_url
                                                                                                                                                                                                    END AS profile_avatar_url,
                                                                                                                                                                                                        CASE
                                                                                                                                                                                                              WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
                                                                                                                                                                                                                    ELSE pr.avatar_url
                                                                                                                                                                                                                        END AS avatar_url,
                                                                                                                                                                                                                            (p.anonymous IS TRUE AND c.author_id = p.author_id) AS is_anonymous_author,
                                                                                                                                                                                                                                (auth.uid() IS NOT NULL AND c.author_id = auth.uid()) AS viewer_is_author
                                                                                                                                                                                                                                  FROM public.comments c
                                                                                                                                                                                                                                    JOIN public.posts p ON p.id = c.post_id
                                                                                                                                                                                                                                      LEFT JOIN public.profiles pr ON pr.id = c.author_id
                                                                                                                                                                                                                                        WHERE c.post_id = target_post_id
                                                                                                                                                                                                                                            AND COALESCE(NULLIF(TRIM(c.body), ''), '') <> ''
                                                                                                                                                                                                                                                AND LOWER(TRIM(c.body)) <> '[deleted]'
                                                                                                                                                                                                                                                  ORDER BY c.created_at ASC
                                                                                                                                                                                                                                                    LIMIT LEAST(GREATEST(COALESCE(limit_count, 50), 1), 100);
                                                                                                                                                                                                                                                    $function$;


CREATE OR REPLACE FUNCTION public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, comment_id uuid, post_id uuid, body text, created_at timestamp with time zone, author_id uuid, author_user_id uuid, author_name_cached text, author_color_cached text, author_avatar_url text, author_avatar_url_cached text, profile_avatar_url text, avatar_url text, is_anonymous_author boolean, viewer_is_author boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                        WITH ranked_comments AS (
                                                                                                                                                                                                                                                                                            SELECT
                                                                                                                                                                                                                                                                                                  c.*,
                                                                                                                                                                                                                                                                                                        p.anonymous AS post_is_anonymous,
                                                                                                                                                                                                                                                                                                              p.author_id AS post_author_id,
                                                                                                                                                                                                                                                                                                                    pr.full_name AS profile_full_name,
                                                                                                                                                                                                                                                                                                                          pr.avatar_color AS profile_avatar_color,
                                                                                                                                                                                                                                                                                                                                pr.avatar_url AS profile_avatar_url,
                                                                                                                                                                                                                                                                                                                                      ROW_NUMBER() OVER (PARTITION BY c.post_id ORDER BY c.created_at ASC) AS rn
                                                                                                                                                                                                                                                                                                                                          FROM public.comments c
                                                                                                                                                                                                                                                                                                                                              JOIN public.posts p ON p.id = c.post_id
                                                                                                                                                                                                                                                                                                                                                  LEFT JOIN public.profiles pr ON pr.id = c.author_id
                                                                                                                                                                                                                                                                                                                                                      WHERE c.post_id = ANY(target_post_ids)
                                                                                                                                                                                                                                                                                                                                                            AND COALESCE(NULLIF(TRIM(c.body), ''), '') <> ''
                                                                                                                                                                                                                                                                                                                                                                  AND LOWER(TRIM(c.body)) <> '[deleted]'
                                                                                                                                                                                                                                                                                                                                                                    )
                                                                                                                                                                                                                                                                                                                                                                      SELECT
                                                                                                                                                                                                                                                                                                                                                                          rc.id,
                                                                                                                                                                                                                                                                                                                                                                              rc.id AS comment_id,
                                                                                                                                                                                                                                                                                                                                                                                  rc.post_id,
                                                                                                                                                                                                                                                                                                                                                                                      rc.body,
                                                                                                                                                                                                                                                                                                                                                                                          rc.created_at,
                                                                                                                                                                                                                                                                                                                                                                                              CASE
                                                                                                                                                                                                                                                                                                                                                                                                    WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
                                                                                                                                                                                                                                                                                                                                                                                                          ELSE rc.author_id
                                                                                                                                                                                                                                                                                                                                                                                                              END AS author_id,
                                                                                                                                                                                                                                                                                                                                                                                                                  CASE
                                                                                                                                                                                                                                                                                                                                                                                                                        WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
                                                                                                                                                                                                                                                                                                                                                                                                                              ELSE rc.author_id
                                                                                                                                                                                                                                                                                                                                                                                                                                  END AS author_user_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                      CASE
                                                                                                                                                                                                                                                                                                                                                                                                                                            WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN 'Anonymous'
                                                                                                                                                                                                                                                                                                                                                                                                                                                  ELSE COALESCE(rc.profile_full_name, 'Member')
                                                                                                                                                                                                                                                                                                                                                                                                                                                      END AS author_name_cached,
                                                                                                                                                                                                                                                                                                                                                                                                                                                          CASE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN '#5C6470'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ELSE rc.profile_avatar_color
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END AS author_color_cached,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              CASE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ELSE rc.profile_avatar_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              END AS author_avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  CASE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ELSE rc.profile_avatar_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END AS author_avatar_url_cached,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      CASE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ELSE rc.profile_avatar_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END AS profile_avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          CASE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ELSE rc.profile_avatar_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END AS avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              (rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id) AS is_anonymous_author,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  (auth.uid() IS NOT NULL AND rc.author_id = auth.uid()) AS viewer_is_author
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    FROM ranked_comments rc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      WHERE rc.rn <= LEAST(GREATEST(COALESCE(per_post_limit, 50), 1), 100)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ORDER BY rc.post_id, rc.created_at ASC;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        $function$;


CREATE OR REPLACE FUNCTION public.get_public_posts(limit_count integer DEFAULT 50, cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, cursor_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_id uuid, category text, body text, anonymous boolean, status text, edited boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_name text, author_color text, upvote_count bigint, comment_count bigint, report_count bigint, image_url text, image_key text, image_width integer, image_height integer, image_size integer, image_thumbnail_url text, image_thumbnail_key text, image_thumbnail_width integer, image_thumbnail_height integer, image_thumbnail_size integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                              select
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      case when p.anonymous then null else p.author_id end as author_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.category,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.body,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.anonymous,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p.status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.edited,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.created_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.updated_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      case when p.anonymous then null else p.author_name_cached end as author_name,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          case when p.anonymous then null else p.author_color_cached end as author_color,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              coalesce(p.upvote_count, 0)::bigint as upvote_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  coalesce(p.comment_count, 0)::bigint as comment_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      coalesce(p.report_count, 0)::bigint as report_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.image_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.image_key,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.image_width,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p.image_height,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.image_size,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.image_thumbnail_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.image_thumbnail_key,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p.image_thumbnail_width,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.image_thumbnail_height,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.image_thumbnail_size
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                from public.posts p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  where p.status in ('active', 'reported')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      and (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            cursor_created_at is null
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  or cursor_id is null
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        or (p.created_at, p.id) < (cursor_created_at, cursor_id)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              order by p.created_at desc, p.id desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                limit greatest(1, least(limit_count, 50));
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                $function$;


CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_color text, avatar_url text, role text, status text, verification_status text, base text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.full_name,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    null::text as role,
    null::text as status,
    null::text as verification_status,
    p.base,
    p.created_at
  from public.profiles p
  where p.id = p_user_id
    and p.status = 'verified'
    and p.verification_status = 'verified'
  limit 1;
$function$;


CREATE OR REPLACE FUNCTION public.get_public_profiles_for_ids(p_user_ids uuid[])
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_color text, avatar_url text, base text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with safe_ids as (
    select distinct user_id
    from unnest(coalesce(p_user_ids, array[]::uuid[])) as user_id
    where user_id is not null
    limit 100
  )
  select
    p.id,
    p.full_name,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.base,
    p.created_at
  from safe_ids s
  join public.profiles p
    on p.id = s.user_id
  where p.status = 'verified'
    and p.verification_status = 'verified';
$function$;


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
      id,
          email,
              personal_email,
                  full_name,
                      phone,
                          bio,
                              avatar_color,
                                  base,
                                      role,
                                          status,
                                              verification_status,
                                                  created_at,
                                                      updated_at
                                                        )
                                                          values (
                                                              new.id,
                                                                  lower(coalesce(new.email, '')),
                                                                      lower(coalesce(new.raw_user_meta_data ->> 'personal_email', new.email, '')),
                                                                          coalesce(
                                                                                nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                                                                                      split_part(coalesce(new.email, ''), '@', 1),
                                                                                            'SoldierHub Member'
                                                                                                ),
                                                                                                    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
                                                                                                        coalesce(new.raw_user_meta_data ->> 'bio', ''),
                                                                                                            coalesce(nullif(new.raw_user_meta_data ->> 'avatar_color', ''), '#314A66'),
                                                                                                                'Fort Bliss',
                                                                                                                    'user',
                                                                                                                        'pending',
                                                                                                                            'pending',
                                                                                                                                now(),
                                                                                                                                    now()
                                                                                                                                      )
                                                                                                                                        on conflict (id) do update set
                                                                                                                                            email = excluded.email,
                                                                                                                                                personal_email = excluded.personal_email,
                                                                                                                                                    full_name = excluded.full_name,
                                                                                                                                                        phone = excluded.phone,
                                                                                                                                                            bio = excluded.bio,
                                                                                                                                                                avatar_color = excluded.avatar_color,
                                                                                                                                                                    updated_at = now();

                                                                                                                                                                      return new;
                                                                                                                                                                      end;
                                                                                                                                                                      $function$;


CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'verified'
      and verification_status = 'verified'
  );
$function$;


CREATE OR REPLACE FUNCTION public.is_verified()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'verified'
      and verification_status = 'verified'
  );
$function$;


CREATE OR REPLACE FUNCTION public.is_verified_profile(p_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.status = 'verified'
      and p.verification_status = 'verified'
  );
$function$;


CREATE OR REPLACE FUNCTION public.list_my_follow_connections(p_list_type text DEFAULT 'followers'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text, followed_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                        declare
                                                                                                                                                                                                                                                                                                                                          safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
                                                                                                                                                                                                                                                                                                                                            safe_offset integer := greatest(coalesce(p_offset, 0), 0);
                                                                                                                                                                                                                                                                                                                                            begin
                                                                                                                                                                                                                                                                                                                                              if auth.uid() is null then
                                                                                                                                                                                                                                                                                                                                                  raise exception 'Authentication required';
                                                                                                                                                                                                                                                                                                                                                    end if;

                                                                                                                                                                                                                                                                                                                                                      if not public.is_verified_profile(auth.uid()) then
                                                                                                                                                                                                                                                                                                                                                          raise exception 'Verified account required';
                                                                                                                                                                                                                                                                                                                                                            end if;

                                                                                                                                                                                                                                                                                                                                                              if lower(coalesce(p_list_type, 'followers')) = 'following' then
                                                                                                                                                                                                                                                                                                                                                                  return query
                                                                                                                                                                                                                                                                                                                                                                        select
                                                                                                                                                                                                                                                                                                                                                                                p.id as profile_id,
                                                                                                                                                                                                                                                                                                                                                                                        coalesce(p.full_name, 'SoldierHub member')::text as full_name,
                                                                                                                                                                                                                                                                                                                                                                                                coalesce(p.avatar_color, '#314A66')::text as avatar_color,
                                                                                                                                                                                                                                                                                                                                                                                                        p.avatar_url::text as avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                coalesce(p.base, 'Fort Bliss')::text as base,
                                                                                                                                                                                                                                                                                                                                                                                                                        pf.created_at as followed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                null::bigint as total_count
                                                                                                                                                                                                                                                                                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                                                                                                                                                                                                                                                                                            join public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                    on p.id = pf.following_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                          where pf.follower_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  and p.status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and p.verification_status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                order by pf.created_at desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      offset safe_offset
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            limit safe_limit;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                return;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    return query
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        select
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.id as profile_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    coalesce(p.full_name, 'SoldierHub member')::text as full_name,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          coalesce(p.avatar_color, '#314A66')::text as avatar_color,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                p.avatar_url::text as avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      coalesce(p.base, 'Fort Bliss')::text as base,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            pf.created_at as followed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  null::bigint as total_count
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          join public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                on p.id = pf.follower_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    where pf.following_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and p.status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                and p.verification_status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    order by pf.created_at desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        offset safe_offset
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            limit safe_limit;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            $function$;


CREATE OR REPLACE FUNCTION public.list_my_notifications_hydrated(p_limit integer DEFAULT 30, p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_notification_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(id uuid, recipient_user_id uuid, actor_user_id uuid, actor_id uuid, actor_name_cached text, actor_color_cached text, actor_avatar_url text, type text, post_id uuid, comment_id uuid, read boolean, created_at timestamp with time zone, post_title_cached text, post_preview_cached text, comment_body_cached text, post jsonb, comment jsonb, actor_profile jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  safe_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
  safe_notification_ids uuid[];
begin
  -- This RPC is only for logged-in verified users reading their own notifications.
  if v_user_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.status = 'verified'
      and p.verification_status = 'verified'
  ) then
    return;
  end if;

  if p_notification_ids is not null then
    select array_agg(notification_id)
      into safe_notification_ids
    from (
      select distinct notification_id
      from unnest(p_notification_ids) as notification_id
      where notification_id is not null
      limit 50
    ) ids;

    if safe_notification_ids is null or array_length(safe_notification_ids, 1) is null then
      return;
    end if;
  end if;

  return query
  with selected_notifications as (
    select n.*
    from public.notifications n
    where n.recipient_user_id = v_user_id
      and (
        safe_notification_ids is null
        or n.id = any(safe_notification_ids)
      )
      and (
        safe_notification_ids is not null
        or p_cursor_created_at is null
        or p_cursor_id is null
        or (n.created_at, n.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by n.created_at desc, n.id desc
    limit safe_limit
  )
  select
    n.id,
    n.recipient_user_id,
    case
      when p.anonymous is true and c.author_id = p.author_id then null
      else resolved.actor_id
    end as actor_user_id,
    case
      when p.anonymous is true and c.author_id = p.author_id then null
      else resolved.actor_id
    end as actor_id,
    case
      when p.anonymous is true and c.author_id = p.author_id then 'Anonymous'
      else coalesce(ap.full_name, n.actor_name_cached, 'Someone')
    end::text as actor_name_cached,
    case
      when p.anonymous is true and c.author_id = p.author_id then '#5C6470'
      else coalesce(ap.avatar_color, '#314A66')
    end::text as actor_color_cached,
    case
      when p.anonymous is true and c.author_id = p.author_id then null
      else ap.avatar_url
    end::text as actor_avatar_url,
    n.type,
    coalesce(n.post_id, c.post_id) as post_id,
    n.comment_id,
    n.read,
    n.created_at,
    coalesce(nullif(n.post_title_cached, ''), left(coalesce(p.body, ''), 180), '')::text as post_title_cached,
    coalesce(left(coalesce(p.body, n.post_title_cached, ''), 220), '')::text as post_preview_cached,
    coalesce(c.body, '')::text as comment_body_cached,
    case
      when p.id is null then null
      else jsonb_strip_nulls(jsonb_build_object(
        'id', p.id,
        'post_id', p.id,
        'body', p.body,
        'category', p.category,
        'anonymous', p.anonymous,
        'status', p.status,
        'created_at', p.created_at,
        'author_id', case when p.anonymous then null else p.author_id end,
        'author_name', case when p.anonymous then null else p.author_name_cached end,
        'author_color', case when p.anonymous then null else p.author_color_cached end,
        'image_url', p.image_url,
        'image_key', p.image_key,
        'image_width', p.image_width,
        'image_height', p.image_height,
        'image_size', p.image_size
      ))
    end as post,
    case
      when c.id is null then null
      else jsonb_strip_nulls(jsonb_build_object(
        'id', c.id,
        'comment_id', c.id,
        'post_id', c.post_id,
        'body', c.body,
        'created_at', c.created_at,
        'author_id', case when p.anonymous is true and c.author_id = p.author_id then null else c.author_id end,
        'author_name_cached', case when p.anonymous is true and c.author_id = p.author_id then 'Anonymous' else coalesce(cp.full_name, c.author_name_cached, 'Member') end,
        'author_color_cached', case when p.anonymous is true and c.author_id = p.author_id then '#5C6470' else coalesce(cp.avatar_color, c.author_color_cached, '#314A66') end,
        'author_avatar_url', case when p.anonymous is true and c.author_id = p.author_id then null else cp.avatar_url end,
        'is_anonymous_author', (p.anonymous is true and c.author_id = p.author_id)
      ))
    end as comment,
    case
      when resolved.actor_id is null then null
      when p.anonymous is true and c.author_id = p.author_id then null
      else jsonb_strip_nulls(jsonb_build_object(
        'id', ap.id,
        'full_name', ap.full_name,
        'avatar_color', ap.avatar_color,
        'avatar_url', ap.avatar_url,
        'base', ap.base
      ))
    end as actor_profile
  from selected_notifications n
  left join public.comments c
    on c.id = n.comment_id
   and c.deleted_at is null
   and coalesce(nullif(trim(c.body), ''), '') <> ''
   and lower(trim(c.body)) <> '[deleted]'
  left join public.posts p
    on p.id = coalesce(n.post_id, c.post_id)
  left join lateral (
    select case
      when n.type = 'comment' and c.author_id is not null then c.author_id
      else n.actor_user_id
    end as actor_id
  ) resolved on true
  left join public.profiles ap
    on ap.id = resolved.actor_id
  left join public.profiles cp
    on cp.id = c.author_id
  order by n.created_at desc, n.id desc;
end;
$function$;


CREATE OR REPLACE FUNCTION public.list_public_posts_by_author(p_profile_id uuid, p_limit integer DEFAULT 30, p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_id uuid, category text, body text, anonymous boolean, status text, edited boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_name text, author_color text, author_avatar_url text, upvote_count bigint, comment_count bigint, report_count bigint, image_url text, image_key text, image_width integer, image_height integer, image_size integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.author_id,
    p.category,
    p.body,
    p.anonymous,
    p.status,
    p.edited,
    p.created_at,
    p.updated_at,
    coalesce(p.author_name_cached, pr.full_name, 'Member') as author_name,
    coalesce(p.author_color_cached, pr.avatar_color, '#314A66') as author_color,
    pr.avatar_url as author_avatar_url,
    coalesce((
      select count(*)
      from public.upvotes u
      where u.post_id = p.id
    ), 0)::bigint as upvote_count,
    coalesce((
      select count(*)
      from public.comments c
      where c.post_id = p.id
        and c.deleted_at is null
    ), 0)::bigint as comment_count,
    (
      coalesce((
        select count(*)
        from public.reports r
        where r.post_id = p.id
      ), 0)
      +
      coalesce((
        select count(*)
        from public.visitor_reports vr
        where vr.post_id = p.id
      ), 0)
    )::bigint as report_count,
    p.image_url,
    p.image_key,
    p.image_width,
    p.image_height,
    p.image_size
  from public.posts p
  join public.profiles pr
    on pr.id = p.author_id
  where p.author_id = p_profile_id
    and p.anonymous is false
    and p.status in ('active', 'reported')
    and pr.status = 'verified'
    and pr.verification_status = 'verified'
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$function$;


CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                      begin
                                                                                                                                                                        -- Admins can manage verification/admin fields.
                                                                                                                                                                          if public.is_admin() then
                                                                                                                                                                              return new;
                                                                                                                                                                                end if;

                                                                                                                                                                                  -- Normal users cannot change identity, verification, or admin-controlled fields.
                                                                                                                                                                                    if new.id is distinct from old.id then
                                                                                                                                                                                        raise exception 'Profile ID cannot be changed.';
                                                                                                                                                                                          end if;

                                                                                                                                                                                            if new.email is distinct from old.email then
                                                                                                                                                                                                raise exception 'Email cannot be changed from profile settings.';
                                                                                                                                                                                                  end if;

                                                                                                                                                                                                    if new.personal_email is distinct from old.personal_email then
                                                                                                                                                                                                        raise exception 'Personal email cannot be changed from profile settings.';
                                                                                                                                                                                                          end if;

                                                                                                                                                                                                            if new.phone is distinct from old.phone then
                                                                                                                                                                                                                raise exception 'Phone number cannot be changed from profile settings.';
                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                    if new.role is distinct from old.role then
                                                                                                                                                                                                                        raise exception 'Role cannot be changed from profile settings.';
                                                                                                                                                                                                                          end if;

                                                                                                                                                                                                                            if new.status is distinct from old.status then
                                                                                                                                                                                                                                raise exception 'Account status cannot be changed from profile settings.';
                                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                                    if new.verification_status is distinct from old.verification_status then
                                                                                                                                                                                                                                        raise exception 'Verification status cannot be changed from profile settings.';
                                                                                                                                                                                                                                          end if;

                                                                                                                                                                                                                                            if new.created_at is distinct from old.created_at then
                                                                                                                                                                                                                                                raise exception 'Created date cannot be changed.';
                                                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                                                    return new;
                                                                                                                                                                                                                                                    end;
                                                                                                                                                                                                                                                    $function$;


CREATE OR REPLACE FUNCTION public.recount_post_counters(p_post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                  begin
                                                    if p_post_id is null then
                                                        return;
                                                          end if;

                                                            update public.posts p
                                                              set
                                                                  upvote_count = coalesce((
                                                                        select count(*)::integer
                                                                              from public.upvotes u
                                                                                    where u.post_id = p_post_id
                                                                                        ), 0),

                                                                                            comment_count = coalesce((
                                                                                                  select count(*)::integer
                                                                                                        from public.comments c
                                                                                                              where c.post_id = p_post_id
                                                                                                                      and c.deleted_at is null
                                                                                                                          ), 0),

                                                                                                                              report_count = (
                                                                                                                                    coalesce((
                                                                                                                                            select count(*)::integer
                                                                                                                                                    from public.reports r
                                                                                                                                                            where r.post_id = p_post_id
                                                                                                                                                                  ), 0)
                                                                                                                                                                        +
                                                                                                                                                                              coalesce((
                                                                                                                                                                                      select count(*)::integer
                                                                                                                                                                                              from public.visitor_reports vr
                                                                                                                                                                                                      where vr.post_id = p_post_id
                                                                                                                                                                                                            ), 0)
                                                                                                                                                                                                                )
                                                                                                                                                                                                                  where p.id = p_post_id;
                                                                                                                                                                                                                  end;
                                                                                                                                                                                                                  $function$;


CREATE OR REPLACE FUNCTION public.request_profile_rereview(p_phone text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                    begin
                                                                                                                                                                                                                                                      if auth.uid() is null then
                                                                                                                                                                                                                                                          raise exception 'You must be signed in to request re-review.';
                                                                                                                                                                                                                                                            end if;

                                                                                                                                                                                                                                                              update public.profiles
                                                                                                                                                                                                                                                                set
                                                                                                                                                                                                                                                                    status = 'pending',
                                                                                                                                                                                                                                                                        verification_status = 'pending',
                                                                                                                                                                                                                                                                            phone = coalesce(nullif(p_phone, ''), phone)
                                                                                                                                                                                                                                                                              where id = auth.uid()
                                                                                                                                                                                                                                                                                  and status in ('rejected', 'revoked');
                                                                                                                                                                                                                                                                                  end;
                                                                                                                                                                                                                                                                                  $function$;


CREATE OR REPLACE FUNCTION public.restore_reported_post(p_post_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized.');
  end if;

  delete from public.reports where post_id = p_post_id;
  delete from public.visitor_reports where post_id = p_post_id;

  update public.posts
  set status = 'active'
  where id = p_post_id;

  return jsonb_build_object('ok', true);
end;
$function$;


CREATE OR REPLACE FUNCTION public.search_verified_profile_by_email(p_email text)
 RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if clean_email = '' or clean_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Valid email required';
  end if;

  if not public.is_verified_profile(auth.uid()) then
    raise exception 'Verified account required';
  end if;

  return query
  select
    p.id as profile_id,
    coalesce(p.full_name, 'SoldierHub member')::text as full_name,
    coalesce(p.avatar_color, '#314A66')::text as avatar_color,
    p.avatar_url::text as avatar_url,
    coalesce(p.base, 'Fort Bliss')::text as base
  from public.profiles p
  where (
    lower(coalesce(p.email, '')) = clean_email
    or lower(coalesce(p.personal_email, '')) = clean_email
  )
    and p.status = 'verified'
    and p.verification_status = 'verified'
  order by p.created_at asc
  limit 1;
end;
$function$;


CREATE OR REPLACE FUNCTION public.tg_cache_author_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;


CREATE OR REPLACE FUNCTION public.tg_cache_comment_author()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pname  text;
  pcolor text;
begin
  select full_name, avatar_color into pname, pcolor
  from public.profiles where id = new.author_id;
  new.author_name_cached  := pname;
  new.author_color_cached := pcolor;
  return new;
end $function$;


CREATE OR REPLACE FUNCTION public.tg_mark_post_reported()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.posts set status = 'reported' where id = new.post_id and status = 'active';
  return new;
end $function$;


CREATE OR REPLACE FUNCTION public.tg_notify_on_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  post_author uuid;
  actor_name_local text;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is null or post_author = new.author_id then
    return new;
  end if;

  select full_name into actor_name_local
  from public.profiles
  where id = new.author_id;

  insert into public.notifications
    (recipient_user_id, actor_user_id, actor_name_cached, type, post_id, comment_id)
  values
    (post_author, new.author_id, actor_name_local, 'comment', new.post_id, new.id);

  return new;
end $function$;


CREATE OR REPLACE FUNCTION public.tg_notify_on_upvote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_post record;
    actor_profile record;
    begin
      select p.id, p.author_id, p.body
          into target_post
            from public.posts p
              where p.id = new.post_id
                limit 1;

                  if target_post.author_id is null then
                      return new;
                        end if;

                          -- Do not notify users for their own upvotes.
                            if target_post.author_id = new.user_id then
                                return new;
                                  end if;

                                    select pr.full_name, pr.avatar_color
                                        into actor_profile
                                          from public.profiles pr
                                            where pr.id = new.user_id
                                              limit 1;

                                                insert into public.notifications (
                                                    recipient_user_id,
                                                        actor_user_id,
                                                            actor_name_cached,
                                                                type,
                                                                    post_id,
                                                                        post_title_cached,
                                                                            read
                                                                              )
                                                                                values (
                                                                                    target_post.author_id,
                                                                                        new.user_id,
                                                                                            coalesce(actor_profile.full_name, 'Someone'),
                                                                                                'upvote',
                                                                                                    new.post_id,
                                                                                                        left(coalesce(target_post.body, 'your post'), 180),
                                                                                                            false
                                                                                                              )
                                                                                                                on conflict do nothing;

                                                                                                                  return new;
                                                                                                                  end;
                                                                                                                  $function$;


CREATE OR REPLACE FUNCTION public.tg_recount_comment_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                              begin
                                                                                                                                                                                                                                                                                if tg_op = 'INSERT' then
                                                                                                                                                                                                                                                                                    perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                        return new;

                                                                                                                                                                                                                                                                                          elsif tg_op = 'DELETE' then
                                                                                                                                                                                                                                                                                              perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                  return old;

                                                                                                                                                                                                                                                                                                    elsif tg_op = 'UPDATE' then
                                                                                                                                                                                                                                                                                                        if old.post_id is distinct from new.post_id then
                                                                                                                                                                                                                                                                                                              perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                                    perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                        elsif old.deleted_at is distinct from new.deleted_at then
                                                                                                                                                                                                                                                                                                                              perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                                                                                                                                      return new;
                                                                                                                                                                                                                                                                                                                                        end if;

                                                                                                                                                                                                                                                                                                                                          return null;
                                                                                                                                                                                                                                                                                                                                          end;
                                                                                                                                                                                                                                                                                                                                          $function$;


CREATE OR REPLACE FUNCTION public.tg_recount_report_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                          begin
                                                                                                                                                                                                                                                                                                                                            if tg_op = 'INSERT' then
                                                                                                                                                                                                                                                                                                                                                perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                                                    return new;

                                                                                                                                                                                                                                                                                                                                                      elsif tg_op = 'DELETE' then
                                                                                                                                                                                                                                                                                                                                                          perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                                                                              return old;

                                                                                                                                                                                                                                                                                                                                                                elsif tg_op = 'UPDATE' then
                                                                                                                                                                                                                                                                                                                                                                    if old.post_id is distinct from new.post_id then
                                                                                                                                                                                                                                                                                                                                                                          perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                                                                                                perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                                                                                    else
                                                                                                                                                                                                                                                                                                                                                                                          perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                                                                                              end if;

                                                                                                                                                                                                                                                                                                                                                                                                  return new;
                                                                                                                                                                                                                                                                                                                                                                                                    end if;

                                                                                                                                                                                                                                                                                                                                                                                                      return null;
                                                                                                                                                                                                                                                                                                                                                                                                      end;
                                                                                                                                                                                                                                                                                                                                                                                                      $function$;


CREATE OR REPLACE FUNCTION public.tg_recount_upvote_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                  begin
                                                                                                                                                                                                                    if tg_op = 'INSERT' then
                                                                                                                                                                                                                        perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                            return new;

                                                                                                                                                                                                                              elsif tg_op = 'DELETE' then
                                                                                                                                                                                                                                  perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                      return old;

                                                                                                                                                                                                                                        elsif tg_op = 'UPDATE' then
                                                                                                                                                                                                                                            if old.post_id is distinct from new.post_id then
                                                                                                                                                                                                                                                  perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                        perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                            else
                                                                                                                                                                                                                                                                  perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                      end if;

                                                                                                                                                                                                                                                                          return new;
                                                                                                                                                                                                                                                                            end if;

                                                                                                                                                                                                                                                                              return null;
                                                                                                                                                                                                                                                                              end;
                                                                                                                                                                                                                                                                              $function$;


CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;


CREATE OR REPLACE FUNCTION public.toggle_post_report(p_post_id uuid, p_reason text DEFAULT ''::text)
 RETURNS TABLE(reported boolean, report_count bigint, post_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_already_reported boolean;
  v_report_count bigint;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to report a post.';
  end if;

  select exists (
    select 1
    from public.reports
    where post_id = p_post_id
      and user_id = v_user_id
  )
  into v_already_reported;

  if v_already_reported then
    delete from public.reports
    where post_id = p_post_id
      and user_id = v_user_id;
  else
    insert into public.reports (post_id, user_id, reason)
    values (p_post_id, v_user_id, coalesce(p_reason, ''))
    on conflict (post_id, user_id) do nothing;
  end if;

  select count(*)
  from public.reports
  where post_id = p_post_id
  into v_report_count;

  if v_report_count > 0 then
    v_status := 'reported';
  else
    v_status := 'active';
  end if;

  update public.posts
  set status = v_status
  where id = p_post_id;

  return query
  select
    not v_already_reported as reported,
    v_report_count as report_count,
    v_status as post_status;
end;
$function$;


-- VIEWS
create or replace view public.my_posts_with_meta as
 SELECT id,
    author_id,
    category,
    body,
    anonymous,
    status,
    edited,
    created_at,
    updated_at,
    author_name_cached AS author_name,
    author_color_cached AS author_color,
    COALESCE(upvote_count, 0)::bigint AS upvote_count,
    COALESCE(comment_count, 0)::bigint AS comment_count,
    COALESCE(report_count, 0)::bigint AS report_count,
    image_url,
    image_key,
    image_width,
    image_height,
    image_size,
    image_thumbnail_url,
    image_thumbnail_key,
    image_thumbnail_width,
    image_thumbnail_height,
    image_thumbnail_size
   FROM posts p;;

create or replace view public.posts_with_meta as
 SELECT id,
        CASE
            WHEN anonymous THEN NULL::uuid
            ELSE author_id
        END AS author_id,
    category,
    body,
    anonymous,
    status,
    edited,
    created_at,
    updated_at,
        CASE
            WHEN anonymous THEN NULL::text
            ELSE author_name_cached
        END AS author_name,
        CASE
            WHEN anonymous THEN NULL::text
            ELSE author_color_cached
        END AS author_color,
    COALESCE(upvote_count, 0)::bigint AS upvote_count,
    COALESCE(comment_count, 0)::bigint AS comment_count,
    COALESCE(report_count, 0)::bigint AS report_count,
    image_url,
    image_key,
    image_width,
    image_height,
    image_size,
    image_thumbnail_url,
    image_thumbnail_key,
    image_thumbnail_width,
    image_thumbnail_height,
    image_thumbnail_size
   FROM posts p
  WHERE status = ANY (ARRAY['active'::text, 'reported'::text]);;

create or replace view public.profile_follow_counts as
 SELECT p.id AS profile_id,
    COALESCE(followers.followers_count, 0::bigint) AS followers_count,
    COALESCE(following.following_count, 0::bigint) AS following_count
   FROM profiles p
     LEFT JOIN ( SELECT profile_follows.following_id,
            count(*) AS followers_count
           FROM profile_follows
          GROUP BY profile_follows.following_id) followers ON followers.following_id = p.id
     LEFT JOIN ( SELECT profile_follows.follower_id,
            count(*) AS following_count
           FROM profile_follows
          GROUP BY profile_follows.follower_id) following ON following.follower_id = p.id
  WHERE p.status = 'verified'::text AND p.verification_status = 'verified'::text;;

create or replace view public.public_profiles with (security_invoker=true) as
 SELECT id,
    full_name,
    bio,
    avatar_color,
    avatar_url,
    base,
    created_at
   FROM profiles
  WHERE status = 'verified'::text AND verification_status = 'verified'::text;;

-- INDEXES
create index if not exists comments_author_id_idx ON public.comments USING btree (author_id);
create index if not exists comments_deleted_by_idx ON public.comments USING btree (deleted_by) WHERE (deleted_by IS NOT NULL);
create unique index if not exists comments_pkey ON public.comments USING btree (id);
create index if not exists comments_post_active_created_idx ON public.comments USING btree (post_id, created_at) WHERE (deleted_at IS NULL);
create index if not exists comments_post_created_id_idx ON public.comments USING btree (post_id, created_at, id);
create index if not exists notifications_actor_user_id_idx ON public.notifications USING btree (actor_user_id) WHERE (actor_user_id IS NOT NULL);
create index if not exists notifications_comment_id_idx ON public.notifications USING btree (comment_id);
create unique index if not exists notifications_pkey ON public.notifications USING btree (id);
create index if not exists notifications_post_id_idx ON public.notifications USING btree (post_id);
create index if not exists notifications_recipient_created_id_idx ON public.notifications USING btree (recipient_user_id, created_at DESC, id DESC);
create index if not exists notifications_recipient_read_created_idx ON public.notifications USING btree (recipient_user_id, read, created_at DESC);
create index if not exists notifications_recipient_read_idx ON public.notifications USING btree (recipient_user_id, read);
create unique index if not exists notifications_unique_follow_actor_recipient_idx ON public.notifications USING btree (recipient_user_id, actor_user_id, type) WHERE ((type = 'follow'::text) AND (actor_user_id IS NOT NULL));
create unique index if not exists notifications_unique_upvote_actor_post_idx ON public.notifications USING btree (recipient_user_id, actor_user_id, post_id, type) WHERE ((type = 'upvote'::text) AND (actor_user_id IS NOT NULL) AND (post_id IS NOT NULL));
create index if not exists idx_posts_image_key ON public.posts USING btree (image_key) WHERE (image_key IS NOT NULL);
create index if not exists posts_author_created_id_idx ON public.posts USING btree (author_id, created_at DESC, id DESC);
create index if not exists posts_author_created_idx ON public.posts USING btree (author_id, created_at DESC);
create index if not exists posts_category_status_created_id_idx ON public.posts USING btree (category, status, created_at DESC, id DESC);
create index if not exists posts_feed_status_created_id_idx ON public.posts USING btree (status, created_at DESC, id DESC);
create index if not exists posts_image_thumbnail_key_idx ON public.posts USING btree (image_thumbnail_key) WHERE (image_thumbnail_key IS NOT NULL);
create unique index if not exists posts_pkey ON public.posts USING btree (id);
create index if not exists posts_reported_created_id_idx ON public.posts USING btree (created_at DESC, id DESC) WHERE (status = 'reported'::text);
create index if not exists profile_follows_follower_created_following_idx ON public.profile_follows USING btree (follower_id, created_at DESC, following_id);
create index if not exists profile_follows_follower_created_idx ON public.profile_follows USING btree (follower_id, created_at DESC);
create index if not exists profile_follows_follower_following_idx ON public.profile_follows USING btree (follower_id, following_id);
create index if not exists profile_follows_following_created_follower_idx ON public.profile_follows USING btree (following_id, created_at DESC, follower_id);
create index if not exists profile_follows_following_created_idx ON public.profile_follows USING btree (following_id, created_at DESC);
create index if not exists profile_follows_following_follower_idx ON public.profile_follows USING btree (following_id, follower_id);
create unique index if not exists profile_follows_pkey ON public.profile_follows USING btree (follower_id, following_id);
create unique index if not exists profiles_email_key ON public.profiles USING btree (email);
create unique index if not exists profiles_pkey ON public.profiles USING btree (id);
create index if not exists profiles_role_idx ON public.profiles USING btree (role);
create index if not exists profiles_status_created_at_idx ON public.profiles USING btree (status, created_at DESC, id DESC);
create index if not exists profiles_status_created_idx ON public.profiles USING btree (status, created_at DESC);
create index if not exists profiles_verified_email_lower_idx ON public.profiles USING btree (lower(email)) WHERE ((status = 'verified'::text) AND (verification_status = 'verified'::text));
create index if not exists profiles_verified_lookup_idx ON public.profiles USING btree (id) WHERE ((status = 'verified'::text) AND (verification_status = 'verified'::text));
create index if not exists profiles_verified_personal_email_lower_idx ON public.profiles USING btree (lower(personal_email)) WHERE ((status = 'verified'::text) AND (verification_status = 'verified'::text));
create unique index if not exists reports_pkey ON public.reports USING btree (post_id, user_id);
create index if not exists reports_user_id_idx ON public.reports USING btree (user_id);
create index if not exists resources_created_at_idx ON public.resources USING btree (created_at DESC);
create unique index if not exists resources_pkey ON public.resources USING btree (id);
create unique index if not exists upvotes_pkey ON public.upvotes USING btree (post_id, user_id);
create index if not exists upvotes_user_id_idx ON public.upvotes USING btree (user_id);
create unique index if not exists visitor_reports_pkey ON public.visitor_reports USING btree (id);
create unique index if not exists visitor_reports_post_id_visitor_key_hash_key ON public.visitor_reports USING btree (post_id, visitor_key_hash);

-- TRIGGERS
drop trigger if exists on_auth_user_created on auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

drop trigger if exists comment_creates_notification on public.comments;
CREATE TRIGGER comment_creates_notification AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION tg_notify_on_comment();

drop trigger if exists comments_cache_author on public.comments;
CREATE TRIGGER comments_cache_author BEFORE INSERT ON comments FOR EACH ROW EXECUTE FUNCTION tg_cache_comment_author();

drop trigger if exists comments_recount_post_counters on public.comments;
CREATE TRIGGER comments_recount_post_counters AFTER INSERT OR DELETE OR UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION tg_recount_comment_counters();

drop trigger if exists posts_cache_author on public.posts;
CREATE TRIGGER posts_cache_author BEFORE INSERT OR UPDATE OF anonymous, author_id ON posts FOR EACH ROW EXECUTE FUNCTION tg_cache_author_fields();

drop trigger if exists posts_updated_at on public.posts;
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

drop trigger if exists profile_follows_create_notification_trigger on public.profile_follows;
CREATE TRIGGER profile_follows_create_notification_trigger AFTER INSERT ON profile_follows FOR EACH ROW EXECUTE FUNCTION create_follow_notification();

drop trigger if exists profiles_updated_at on public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

drop trigger if exists trg_profiles_protect_sensitive_fields on public.profiles;
CREATE TRIGGER trg_profiles_protect_sensitive_fields BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_sensitive_fields();

drop trigger if exists report_marks_post on public.reports;
CREATE TRIGGER report_marks_post AFTER INSERT ON reports FOR EACH ROW EXECUTE FUNCTION tg_mark_post_reported();

drop trigger if exists reports_recount_post_counters on public.reports;
CREATE TRIGGER reports_recount_post_counters AFTER INSERT OR DELETE OR UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION tg_recount_report_counters();

drop trigger if exists upvote_creates_notification on public.upvotes;
CREATE TRIGGER upvote_creates_notification AFTER INSERT ON upvotes FOR EACH ROW EXECUTE FUNCTION tg_notify_on_upvote();

drop trigger if exists upvotes_recount_post_counters on public.upvotes;
CREATE TRIGGER upvotes_recount_post_counters AFTER INSERT OR DELETE OR UPDATE ON upvotes FOR EACH ROW EXECUTE FUNCTION tg_recount_upvote_counters();

drop trigger if exists visitor_reports_recount_post_counters on public.visitor_reports;
CREATE TRIGGER visitor_reports_recount_post_counters AFTER INSERT OR DELETE OR UPDATE ON visitor_reports FOR EACH ROW EXECUTE FUNCTION tg_recount_report_counters();

-- ENABLE ROW LEVEL SECURITY
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.posts enable row level security;
alter table public.profile_follows enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.resources enable row level security;
alter table public.upvotes enable row level security;
alter table public.visitor_reports enable row level security;

-- ROW LEVEL SECURITY POLICIES
drop policy if exists "comments: admins can delete any" on public.comments;
create policy "comments: admins can delete any"
  on public.comments
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "comments: admins can read all" on public.comments;
create policy "comments: admins can read all"
  on public.comments
  as permissive
  for select
  to public
  using (is_admin());

drop policy if exists "comments: authors can delete their own" on public.comments;
create policy "comments: authors can delete their own"
  on public.comments
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = author_id));

drop policy if exists "comments: authors can read their own" on public.comments;
create policy "comments: authors can read their own"
  on public.comments
  as permissive
  for select
  to public
  using ((auth.uid() = author_id));

drop policy if exists "comments: notification recipients can read linked comments" on public.comments;
create policy "comments: notification recipients can read linked comments"
  on public.comments
  as permissive
  for select
  to public
  using ((EXISTS ( SELECT 1
   FROM notifications n
  WHERE ((n.comment_id = comments.id) AND (n.recipient_user_id = auth.uid())))));

drop policy if exists "comments: post authors can read comments on their posts" on public.comments;
create policy "comments: post authors can read comments on their posts"
  on public.comments
  as permissive
  for select
  to public
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = comments.post_id) AND (p.author_id = auth.uid())))));

drop policy if exists "comments: verified users can create" on public.comments;
create policy "comments: verified users can create"
  on public.comments
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "notifications: recipients can delete" on public.notifications;
create policy "notifications: recipients can delete"
  on public.notifications
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_user_id));

drop policy if exists "notifications: recipients can mark read" on public.notifications;
create policy "notifications: recipients can mark read"
  on public.notifications
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_user_id))
  with check ((( SELECT auth.uid() AS uid) = recipient_user_id));

drop policy if exists "notifications: recipients can read" on public.notifications;
create policy "notifications: recipients can read"
  on public.notifications
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_user_id));

drop policy if exists "posts: admins can delete any post" on public.posts;
create policy "posts: admins can delete any post"
  on public.posts
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "posts: admins can read all posts" on public.posts;
create policy "posts: admins can read all posts"
  on public.posts
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "posts: admins can update any post" on public.posts;
create policy "posts: admins can update any post"
  on public.posts
  as permissive
  for update
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "posts: authors can delete their own posts" on public.posts;
create policy "posts: authors can delete their own posts"
  on public.posts
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = author_id));

drop policy if exists "posts: authors can read their own posts" on public.posts;
create policy "posts: authors can read their own posts"
  on public.posts
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = author_id));

drop policy if exists "posts: authors can update their own posts" on public.posts;
create policy "posts: authors can update their own posts"
  on public.posts
  as permissive
  for update
  to authenticated
  using (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)))
  with check (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "posts: verified users can create posts" on public.posts;
create policy "posts: verified users can create posts"
  on public.posts
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "Verified users can follow members" on public.profile_follows;
create policy "Verified users can follow members"
  on public.profile_follows
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = follower_id) AND (follower_id <> following_id) AND (EXISTS ( SELECT 1
   FROM profiles viewer
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND (COALESCE(viewer.status, viewer.verification_status) = 'verified'::text)))) AND (EXISTS ( SELECT 1
   FROM profiles target
  WHERE ((target.id = profile_follows.following_id) AND (COALESCE(target.status, target.verification_status) = 'verified'::text))))));

drop policy if exists "Verified users can read follow rows involving themselves" on public.profile_follows;
create policy "Verified users can read follow rows involving themselves"
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using ((is_verified_profile(auth.uid()) AND ((auth.uid() = follower_id) OR (auth.uid() = following_id))));

drop policy if exists "Verified users can read own follow graph" on public.profile_follows;
create policy "Verified users can read own follow graph"
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using (((( SELECT auth.uid() AS uid) = follower_id) OR (( SELECT auth.uid() AS uid) = following_id) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (COALESCE(p.status, p.verification_status) = 'verified'::text))))));

drop policy if exists "Verified users can unfollow members" on public.profile_follows;
create policy "Verified users can unfollow members"
  on public.profile_follows
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = follower_id));

drop policy if exists profile_follows_delete_own on public.profile_follows;
create policy profile_follows_delete_own
  on public.profile_follows
  as permissive
  for delete
  to authenticated
  using ((auth.uid() = follower_id));

drop policy if exists profile_follows_insert_own_verified on public.profile_follows;
create policy profile_follows_insert_own_verified
  on public.profile_follows
  as permissive
  for insert
  to authenticated
  with check (((auth.uid() = follower_id) AND (follower_id <> following_id) AND is_verified_profile(follower_id) AND is_verified_profile(following_id)));

drop policy if exists profile_follows_select_own on public.profile_follows;
create policy profile_follows_select_own
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using (((auth.uid() = follower_id) OR (auth.uid() = following_id)));

drop policy if exists "profiles: admins can delete any profile" on public.profiles;
create policy "profiles: admins can delete any profile"
  on public.profiles
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "profiles: admins can read all profiles" on public.profiles;
create policy "profiles: admins can read all profiles"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "profiles: admins can update any profile" on public.profiles;
create policy "profiles: admins can update any profile"
  on public.profiles
  as permissive
  for update
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "profiles: users can read their own profile" on public.profiles;
create policy "profiles: users can read their own profile"
  on public.profiles
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id));

drop policy if exists "profiles: users can update their own profile" on public.profiles;
create policy "profiles: users can update their own profile"
  on public.profiles
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id))
  with check ((( SELECT auth.uid() AS uid) = id));

drop policy if exists "reports: admins can clear reports" on public.reports;
create policy "reports: admins can clear reports"
  on public.reports
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "reports: admins can read" on public.reports;
create policy "reports: admins can read"
  on public.reports
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "reports: users can see own reports" on public.reports;
create policy "reports: users can see own reports"
  on public.reports
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

drop policy if exists "reports: verified users can report" on public.reports;
create policy "reports: verified users can report"
  on public.reports
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "Admins can add resources" on public.resources;
create policy "Admins can add resources"
  on public.resources
  as permissive
  for insert
  to public
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
  on public.resources
  as permissive
  for delete
  to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
  on public.resources
  as permissive
  for update
  to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "Anyone can view resources" on public.resources;
create policy "Anyone can view resources"
  on public.resources
  as permissive
  for select
  to public
  using (true);

drop policy if exists "upvotes: admins can read all" on public.upvotes;
create policy "upvotes: admins can read all"
  on public.upvotes
  as permissive
  for select
  to public
  using (is_admin());

drop policy if exists "upvotes: users can read own votes" on public.upvotes;
create policy "upvotes: users can read own votes"
  on public.upvotes
  as permissive
  for select
  to public
  using ((auth.uid() = user_id));

drop policy if exists "upvotes: users can remove own vote" on public.upvotes;
create policy "upvotes: users can remove own vote"
  on public.upvotes
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

drop policy if exists "upvotes: verified users can vote" on public.upvotes;
create policy "upvotes: verified users can vote"
  on public.upvotes
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "visitor_reports: admins can delete" on public.visitor_reports;
create policy "visitor_reports: admins can delete"
  on public.visitor_reports
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "visitor_reports: admins can read" on public.visitor_reports;
create policy "visitor_reports: admins can read"
  on public.visitor_reports
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

-- SCHEMA GRANTS
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

-- TABLE GRANTS
grant DELETE, INSERT, SELECT on table public.comments to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.comments to service_role;
grant SELECT on table public.my_posts_with_meta to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.my_posts_with_meta to service_role;
grant DELETE, SELECT, UPDATE on table public.notifications to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.notifications to service_role;
grant DELETE, INSERT, SELECT on table public.posts to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts to service_role;
grant SELECT on table public.posts_with_meta to anon;
grant SELECT on table public.posts_with_meta to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts_with_meta to service_role;
grant SELECT on table public.profile_follow_counts to anon;
grant SELECT on table public.profile_follow_counts to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profile_follow_counts to service_role;
grant DELETE, INSERT, SELECT on table public.profile_follows to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profile_follows to service_role;
grant DELETE, SELECT, UPDATE on table public.profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profiles to service_role;
grant SELECT on table public.public_profiles to anon;
grant SELECT on table public.public_profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.public_profiles to service_role;
grant DELETE, INSERT, SELECT on table public.reports to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.reports to service_role;
grant SELECT on table public.resources to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.resources to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.resources to service_role;
grant DELETE, INSERT, SELECT on table public.upvotes to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.upvotes to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visitor_reports to service_role;

-- SEQUENCE GRANTS
-- No public sequence grants found.

-- FUNCTION GRANTS
grant execute on function public.admin_list_profiles(p_queue text, p_limit integer) to authenticated;
grant execute on function public.admin_list_profiles(p_queue text, p_limit integer) to service_role;
grant execute on function public.admin_reject_profile(p_profile_id uuid) to authenticated;
grant execute on function public.admin_reject_profile(p_profile_id uuid) to service_role;
grant execute on function public.admin_revoke_profile(p_profile_id uuid) to authenticated;
grant execute on function public.admin_revoke_profile(p_profile_id uuid) to service_role;
grant execute on function public.admin_revoke_profile_by_email(p_email text) to authenticated;
grant execute on function public.admin_revoke_profile_by_email(p_email text) to service_role;
grant execute on function public.admin_verify_profile_by_email(p_email text) to authenticated;
grant execute on function public.admin_verify_profile_by_email(p_email text) to service_role;
grant execute on function public.count_post_reports(p_post_id uuid) to anon;
grant execute on function public.count_post_reports(p_post_id uuid) to authenticated;
grant execute on function public.count_post_reports(p_post_id uuid) to service_role;
grant execute on function public.create_comment_safe(p_post_id uuid, p_body text) to authenticated;
grant execute on function public.create_comment_safe(p_post_id uuid, p_body text) to service_role;
grant execute on function public.create_follow_notification() to service_role;
grant execute on function public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) to anon;
grant execute on function public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) to authenticated;
grant execute on function public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) to service_role;
grant execute on function public.delete_comment_safe(p_comment_id uuid) to authenticated;
grant execute on function public.delete_comment_safe(p_comment_id uuid) to service_role;
grant execute on function public.delete_own_post(p_post_id uuid) to authenticated;
grant execute on function public.delete_own_post(p_post_id uuid) to service_role;
grant execute on function public.delete_post(p_post_id uuid) to service_role;
grant execute on function public.find_verified_profile_by_email(p_email text) to authenticated;
grant execute on function public.find_verified_profile_by_email(p_email text) to service_role;
grant execute on function public.get_anonymous_post_label(p_post_id uuid) to anon;
grant execute on function public.get_anonymous_post_label(p_post_id uuid) to authenticated;
grant execute on function public.get_anonymous_post_label(p_post_id uuid) to service_role;
grant execute on function public.get_latest_public_post_marker() to anon;
grant execute on function public.get_latest_public_post_marker() to authenticated;
grant execute on function public.get_latest_public_post_marker() to service_role;
grant execute on function public.get_my_feed_viewer_state(p_post_ids uuid[]) to authenticated;
grant execute on function public.get_my_feed_viewer_state(p_post_ids uuid[]) to service_role;
grant execute on function public.get_profile_follow_summary(p_profile_id uuid) to authenticated;
grant execute on function public.get_profile_follow_summary(p_profile_id uuid) to service_role;
grant execute on function public.get_public_comments_for_post(target_post_id uuid, limit_count integer) to anon;
grant execute on function public.get_public_comments_for_post(target_post_id uuid, limit_count integer) to authenticated;
grant execute on function public.get_public_comments_for_post(target_post_id uuid, limit_count integer) to service_role;
grant execute on function public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer) to anon;
grant execute on function public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer) to authenticated;
grant execute on function public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer) to service_role;
grant execute on function public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) to anon;
grant execute on function public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) to authenticated;
grant execute on function public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) to service_role;
grant execute on function public.get_public_profile(p_user_id uuid) to anon;
grant execute on function public.get_public_profile(p_user_id uuid) to authenticated;
grant execute on function public.get_public_profile(p_user_id uuid) to service_role;
grant execute on function public.get_public_profiles_for_ids(p_user_ids uuid[]) to anon;
grant execute on function public.get_public_profiles_for_ids(p_user_ids uuid[]) to authenticated;
grant execute on function public.get_public_profiles_for_ids(p_user_ids uuid[]) to service_role;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
grant execute on function public.is_verified() to authenticated;
grant execute on function public.is_verified() to service_role;
grant execute on function public.is_verified_profile(p_profile_id uuid) to authenticated;
grant execute on function public.is_verified_profile(p_profile_id uuid) to service_role;
grant execute on function public.list_my_follow_connections(p_list_type text, p_limit integer, p_offset integer) to authenticated;
grant execute on function public.list_my_follow_connections(p_list_type text, p_limit integer, p_offset integer) to service_role;
grant execute on function public.list_my_notifications_hydrated(p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_notification_ids uuid[]) to authenticated;
grant execute on function public.list_my_notifications_hydrated(p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_notification_ids uuid[]) to service_role;
grant execute on function public.list_public_posts_by_author(p_profile_id uuid, p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid) to anon;
grant execute on function public.list_public_posts_by_author(p_profile_id uuid, p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid) to authenticated;
grant execute on function public.list_public_posts_by_author(p_profile_id uuid, p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid) to service_role;
grant execute on function public.protect_profile_sensitive_fields() to service_role;
grant execute on function public.recount_post_counters(p_post_id uuid) to service_role;
grant execute on function public.request_profile_rereview(p_phone text) to anon;
grant execute on function public.request_profile_rereview(p_phone text) to authenticated;
grant execute on function public.request_profile_rereview(p_phone text) to service_role;
grant execute on function public.restore_reported_post(p_post_id uuid) to authenticated;
grant execute on function public.restore_reported_post(p_post_id uuid) to service_role;
grant execute on function public.search_verified_profile_by_email(p_email text) to authenticated;
grant execute on function public.search_verified_profile_by_email(p_email text) to service_role;
grant execute on function public.tg_cache_author_fields() to service_role;
grant execute on function public.tg_cache_comment_author() to service_role;
grant execute on function public.tg_mark_post_reported() to service_role;
grant execute on function public.tg_notify_on_comment() to service_role;
grant execute on function public.tg_notify_on_upvote() to service_role;
grant execute on function public.tg_recount_comment_counters() to service_role;
grant execute on function public.tg_recount_report_counters() to service_role;
grant execute on function public.tg_recount_upvote_counters() to service_role;
grant execute on function public.tg_set_updated_at() to service_role;
grant execute on function public.toggle_post_report(p_post_id uuid, p_reason text) to authenticated;
grant execute on function public.toggle_post_report(p_post_id uuid, p_reason text) to service_role;

-- REALTIME PUBLICATION TABLES
-- No public realtime publication tables found in live database.

-- SEED: PUBLIC RESOURCES
insert into public.resources
select *
from jsonb_populate_record(null::public.resources, '{"id": "b2ff6945-d61b-4be4-8cf1-90e4d8c484ee", "link": "https://www.fortblissfamilyhomes.com/", "title": "Fort Bliss Housing", "section": "On-Post", "created_at": "2026-05-03T19:00:08.584246+00:00", "updated_at": "2026-05-03T19:00:08.584246+00:00", "description": "On post housing", "display_order": 0}'::jsonb)
on conflict (id) do nothing;
set check_function_bodies = on;

commit;

-- ============================================================================
-- After running this file in a NEW Supabase project:
-- 1. Configure Supabase Auth redirect URLs.
-- 2. Configure Resend SMTP in Supabase Auth.
-- 3. Add Vercel environment variables.
-- 4. Configure Upstash/KV, Cloudflare R2, and Sentry.
-- 5. Create your first user, then make that user admin/verified.
-- ============================================================================
