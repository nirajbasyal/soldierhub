--
-- PostgreSQL database dump
--

\restrict 0G6QBCg2kdJq7Lnd1acQWsbj5kK9wlzWbWbPYLA99bouH4c95tGxreWj4lVoBdX

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_reject_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_reject_profile(p_profile_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject profiles.';
  end if;

  update public.profiles
  set status = 'rejected'
  where id = p_profile_id
    and status = 'pending';
end;
$$;


--
-- Name: admin_revoke_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_revoke_profile(p_profile_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke profiles.';
  end if;

  update public.profiles
  set status = 'revoked'
  where id = p_profile_id
    and status = 'verified';
end;
$$;


--
-- Name: admin_revoke_profile_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_revoke_profile_by_email(p_email text) RETURNS TABLE(id uuid, email text, personal_email text, full_name text, status text, verification_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: admin_verify_profile_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_verify_profile_by_email(p_email text) RETURNS TABLE(id uuid, email text, personal_email text, full_name text, status text, verification_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: count_post_reports(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.count_post_reports(p_post_id uuid) RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    coalesce((select count(*) from public.reports r where r.post_id = p_post_id), 0)
    +
    coalesce((select count(*) from public.visitor_reports vr where vr.post_id = p_post_id), 0);
$$;


--
-- Name: create_comment_safe(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_comment_safe(p_post_id uuid, p_body text) RETURNS TABLE(id uuid, post_id uuid, body text, created_at timestamp with time zone, author_name_cached text, author_color_cached text, is_anonymous_author boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_post record;
  v_comment record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be signed in to comment.';
  end if;

  if not public.is_verified() then
    raise exception 'You must be verified to comment.';
  end if;

  if length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'Comment cannot be empty.';
  end if;

  select
    p.id,
    p.author_id,
    p.anonymous,
    p.status
  into v_post
  from public.posts p
  where p.id = p_post_id
    and p.status in ('active', 'reported');

  if not found then
    raise exception 'Post not found or not available for comments.';
  end if;

  insert into public.comments (post_id, author_id, body)
  values (p_post_id, v_user_id, trim(p_body))
  returning
    comments.id,
    comments.post_id,
    comments.author_id,
    comments.body,
    comments.created_at,
    comments.author_name_cached,
    comments.author_color_cached
  into v_comment;

  return query
  select
    v_comment.id::uuid,
    v_comment.post_id::uuid,
    v_comment.body::text,
    v_comment.created_at::timestamptz,
    case
      when v_post.anonymous = true and v_comment.author_id = v_post.author_id
        then public.get_anonymous_post_label(v_post.id)
      else coalesce(v_comment.author_name_cached, 'Member')
    end::text as author_name_cached,
    case
      when v_post.anonymous = true and v_comment.author_id = v_post.author_id
        then '#5C6470'
      else coalesce(v_comment.author_color_cached, '#314A66')
    end::text as author_color_cached,
    case
      when v_post.anonymous = true and v_comment.author_id = v_post.author_id
        then true
      else false
    end::boolean as is_anonymous_author;
end;
$$;


--
-- Name: create_follow_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_follow_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    $$;


--
-- Name: create_visitor_report(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text DEFAULT ''::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
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
$$;


--
-- Name: delete_comment_safe(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_comment_safe(p_comment_id uuid) RETURNS TABLE(ok boolean, deleted_comment_id uuid, affected_post_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
      and coalesce(p.status, p.verification_status) = 'verified'
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
      and coalesce(p.status, p.verification_status) = 'verified'
      and p.role = 'admin'
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
$$;


--
-- Name: delete_own_post(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_own_post(p_post_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: delete_post(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_post(p_post_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_anonymous_post_label(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_anonymous_post_label(p_post_id uuid) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_public_comments_for_post(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_comments_for_post(target_post_id uuid, limit_count integer DEFAULT 50) RETURNS TABLE(id uuid, post_id uuid, author_id uuid, body text, created_at timestamp with time zone, author_name_cached text, author_color_cached text, is_anonymous_author boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                      select
                          c.id,
                              c.post_id,

                                  case
                                        when coalesce(p.anonymous, false) = true
                                                and c.author_id = p.author_id
                                                      then null
                                                            else c.author_id
                                                                end as author_id,

                                                                    c.body,
                                                                        c.created_at,

                                                                            case
                                                                                  when coalesce(p.anonymous, false) = true
                                                                                          and c.author_id = p.author_id
                                                                                                then public.get_anonymous_post_label(p.id)
                                                                                                      else coalesce(c.author_name_cached, 'Member')
                                                                                                          end as author_name_cached,

                                                                                                              case
                                                                                                                    when coalesce(p.anonymous, false) = true
                                                                                                                            and c.author_id = p.author_id
                                                                                                                                  then '#5C6470'
                                                                                                                                        else coalesce(c.author_color_cached, '#314A66')
                                                                                                                                            end as author_color_cached,

                                                                                                                                                (
                                                                                                                                                      coalesce(p.anonymous, false) = true
                                                                                                                                                            and c.author_id = p.author_id
                                                                                                                                                                ) as is_anonymous_author

                                                                                                                                                                  from public.comments c
                                                                                                                                                                    join public.posts p
                                                                                                                                                                        on p.id = c.post_id
                                                                                                                                                                          where c.post_id = target_post_id
                                                                                                                                                                              and c.deleted_at is null
                                                                                                                                                                                  and p.status in ('active', 'reported')
                                                                                                                                                                                    order by c.created_at asc, c.id asc
                                                                                                                                                                                      limit greatest(1, least(coalesce(limit_count, 50), 100));
                                                                                                                                                                                      $$;


--
-- Name: get_public_posts(integer, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_posts(limit_count integer DEFAULT 50, cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, cursor_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, author_id uuid, category text, body text, anonymous boolean, status text, edited boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_name text, author_color text, upvote_count bigint, comment_count bigint, report_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

                                                                                    coalesce((
                                                                                          select count(*)
                                                                                                from public.upvotes u
                                                                                                      where u.post_id = p.id
                                                                                                          ), 0) as upvote_count,

                                                                                                              -- IMPORTANT FIX:
                                                                                                                  -- Only count visible/non-deleted replies.
                                                                                                                      coalesce((
                                                                                                                            select count(*)
                                                                                                                                  from public.comments c
                                                                                                                                        where c.post_id = p.id
                                                                                                                                                and c.deleted_at is null
                                                                                                                                                    ), 0) as comment_count,

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
                                                                                                                                                                                                                                          ) as report_count

                                                                                                                                                                                                                                            from public.posts p
                                                                                                                                                                                                                                              where p.status in ('active', 'reported')
                                                                                                                                                                                                                                                  and (
                                                                                                                                                                                                                                                        cursor_created_at is null
                                                                                                                                                                                                                                                              or cursor_id is null
                                                                                                                                                                                                                                                                    or (p.created_at, p.id) < (cursor_created_at, cursor_id)
                                                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                                                          order by p.created_at desc, p.id desc
                                                                                                                                                                                                                                                                            limit greatest(1, least(limit_count, 50));
                                                                                                                                                                                                                                                                            $$;


--
-- Name: get_public_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profile(p_user_id uuid) RETURNS TABLE(id uuid, full_name text, bio text, avatar_color text, avatar_url text, role text, status text, verification_status text, base text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                      select
                          p.id,
                              p.full_name,
                                  p.bio,
                                      p.avatar_color,
                                          p.avatar_url,
                                              p.role,
                                                  p.status,
                                                      p.verification_status,
                                                          p.base,
                                                              p.created_at
                                                                from public.profiles p
                                                                  where p.id = p_user_id
                                                                      and coalesce(p.status, p.verification_status) = 'verified'
                                                                        limit 1;
                                                                        $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    email,
    personal_email,
    full_name,
    military_email,
    phone,
    bio,
    avatar_color,
    base,
    role,
    status,
    verification_status,
    created_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'personal_email', new.email),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1),
      'SoldierHub Member'
    ),
    nullif(new.raw_user_meta_data ->> 'military_email', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'bio', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#314A66'),
    'Fort Bliss',
    'user',
    'pending',
    'pending',
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    personal_email = excluded.personal_email,
    full_name = excluded.full_name,
    military_email = excluded.military_email,
    phone = excluded.phone,
    bio = excluded.bio,
    avatar_color = excluded.avatar_color;

  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'verified'
      and verification_status = 'verified'
  );
$$;


--
-- Name: is_verified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_verified() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'verified'
      and verification_status = 'verified'
  );
$$;


--
-- Name: is_verified_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_verified_profile(p_profile_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
      select 1
          from public.profiles p
              where p.id = p_profile_id
                    and coalesce(p.status, p.verification_status) = 'verified'
                      );
                      $$;


--
-- Name: list_my_follow_connections(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_my_follow_connections(p_list_type text DEFAULT 'followers'::text, p_limit integer DEFAULT 100) RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text, followed_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                                                                                                      declare
                                                                                                                                                                                                                                                                        safe_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
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
                                                                                                                                                                                                                                                                                                                                                    pf.created_at as followed_at
                                                                                                                                                                                                                                                                                                                                                          from public.profile_follows pf
                                                                                                                                                                                                                                                                                                                                                                join public.profiles p
                                                                                                                                                                                                                                                                                                                                                                        on p.id = pf.following_id
                                                                                                                                                                                                                                                                                                                                                                              where pf.follower_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                      and public.is_verified_profile(p.id)
                                                                                                                                                                                                                                                                                                                                                                                            order by pf.created_at desc
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                  pf.created_at as followed_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                                                                                                                                                                                                                                                                                                          join public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                on p.id = pf.follower_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    where pf.following_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and public.is_verified_profile(p.id)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              order by pf.created_at desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  limit safe_limit;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  $$;


--
-- Name: protect_profile_sensitive_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_sensitive_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

  if new.military_email is distinct from old.military_email then
    raise exception 'Military email cannot be changed from profile settings.';
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
$$;


--
-- Name: request_profile_rereview(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_profile_rereview(p_military_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request re-review.';
  end if;

  update public.profiles
  set
    status = 'pending',
    verification_status = 'pending',
    military_email = coalesce(nullif(p_military_email, ''), military_email),
    phone = coalesce(nullif(p_phone, ''), phone)
  where id = auth.uid()
    and status in ('rejected', 'revoked');
end;
$$;


--
-- Name: restore_reported_post(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_reported_post(p_post_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: search_verified_profile_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_verified_profile_by_email(p_email text) RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
                                                                                  or lower(coalesce(p.military_email, '')) = clean_email
                                                                                      )
                                                                                          and (
                                                                                                p.status = 'verified'
                                                                                                      or p.verification_status = 'verified'
                                                                                                          )
                                                                                                            order by p.created_at asc
                                                                                                              limit 1;
                                                                                                              end;
                                                                                                              $_$;


--
-- Name: tg_cache_author_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_cache_author_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: tg_cache_comment_author(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_cache_comment_author() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: tg_mark_post_reported(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_mark_post_reported() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.posts set status = 'reported' where id = new.post_id and status = 'active';
  return new;
end $$;


--
-- Name: tg_notify_on_comment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_notify_on_comment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


--
-- Name: toggle_post_report(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_post_report(p_post_id uuid, p_reason text DEFAULT ''::text) RETURNS TABLE(reported boolean, report_count bigint, post_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    author_name_cached text,
    author_color_cached text,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    deleted_reason text
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    author_id uuid NOT NULL,
    author_name_cached text,
    author_color_cached text,
    category text NOT NULL,
    body text DEFAULT ''::text,
    anonymous boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    edited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT posts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'reported'::text, 'removed'::text])))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reason text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upvotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upvotes (
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: visitor_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_reports (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    visitor_key_hash text NOT NULL,
    reason text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: my_posts_with_meta; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.my_posts_with_meta WITH (security_invoker='true') AS
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
    COALESCE(( SELECT count(*) AS count
           FROM public.upvotes u
          WHERE (u.post_id = p.id)), (0)::bigint) AS upvote_count,
    COALESCE(( SELECT count(*) AS count
           FROM public.comments c
          WHERE (c.post_id = p.id)), (0)::bigint) AS comment_count,
    (COALESCE(( SELECT count(*) AS count
           FROM public.reports r
          WHERE (r.post_id = p.id)), (0)::bigint) + COALESCE(( SELECT count(*) AS count
           FROM public.visitor_reports vr
          WHERE (vr.post_id = p.id)), (0)::bigint)) AS report_count
   FROM public.posts p;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    recipient_user_id uuid NOT NULL,
    actor_user_id uuid,
    actor_name_cached text,
    type text NOT NULL,
    post_id uuid,
    comment_id uuid,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    post_title_cached text
);


--
-- Name: posts_with_meta; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.posts_with_meta WITH (security_invoker='true') AS
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
    COALESCE(( SELECT count(*) AS count
           FROM public.upvotes u
          WHERE (u.post_id = p.id)), (0)::bigint) AS upvote_count,
    COALESCE(( SELECT count(*) AS count
           FROM public.comments c
          WHERE (c.post_id = p.id)), (0)::bigint) AS comment_count,
    (COALESCE(( SELECT count(*) AS count
           FROM public.reports r
          WHERE (r.post_id = p.id)), (0)::bigint) + COALESCE(( SELECT count(*) AS count
           FROM public.visitor_reports vr
          WHERE (vr.post_id = p.id)), (0)::bigint)) AS report_count
   FROM public.posts p
  WHERE (status = ANY (ARRAY['active'::text, 'reported'::text]));


--
-- Name: profile_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_follows (
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profile_follows_no_self_follow CHECK ((follower_id <> following_id))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    bio text,
    avatar_color text DEFAULT '#314A66'::text,
    avatar_url text,
    role text DEFAULT 'user'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    base text DEFAULT 'Fort Bliss'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    personal_email text,
    military_email text,
    phone text,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text]))),
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'revoked'::text]))),
    CONSTRAINT profiles_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'revoked'::text])))
);


--
-- Name: profile_follow_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profile_follow_counts AS
 SELECT p.id AS profile_id,
    COALESCE(followers.followers_count, (0)::bigint) AS followers_count,
    COALESCE(following.following_count, (0)::bigint) AS following_count
   FROM ((public.profiles p
     LEFT JOIN ( SELECT profile_follows.following_id,
            count(*) AS followers_count
           FROM public.profile_follows
          GROUP BY profile_follows.following_id) followers ON ((followers.following_id = p.id)))
     LEFT JOIN ( SELECT profile_follows.follower_id,
            count(*) AS following_count
           FROM public.profile_follows
          GROUP BY profile_follows.follower_id) following ON ((following.follower_id = p.id)))
  WHERE (COALESCE(p.status, p.verification_status) = 'verified'::text);


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_profiles WITH (security_invoker='true') AS
 SELECT id,
    full_name,
    bio,
    avatar_color,
    avatar_url,
    base,
    created_at
   FROM public.profiles
  WHERE (status = 'verified'::text);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section text NOT NULL,
    title text NOT NULL,
    description text,
    link text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profile_follows profile_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_follows
    ADD CONSTRAINT profile_follows_pkey PRIMARY KEY (follower_id, following_id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (post_id, user_id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: upvotes upvotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upvotes
    ADD CONSTRAINT upvotes_pkey PRIMARY KEY (post_id, user_id);


--
-- Name: visitor_reports visitor_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_reports
    ADD CONSTRAINT visitor_reports_pkey PRIMARY KEY (id);


--
-- Name: visitor_reports visitor_reports_post_id_visitor_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_reports
    ADD CONSTRAINT visitor_reports_post_id_visitor_key_hash_key UNIQUE (post_id, visitor_key_hash);


--
-- Name: comments_active_post_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_active_post_created_idx ON public.comments USING btree (post_id, created_at) WHERE (deleted_at IS NULL);


--
-- Name: comments_author_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_author_id_idx ON public.comments USING btree (author_id);


--
-- Name: comments_post_active_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_post_active_created_idx ON public.comments USING btree (post_id, created_at) WHERE (deleted_at IS NULL);


--
-- Name: comments_post_created_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_post_created_id_idx ON public.comments USING btree (post_id, created_at, id);


--
-- Name: notifications_comment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_comment_id_idx ON public.notifications USING btree (comment_id);


--
-- Name: notifications_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_post_id_idx ON public.notifications USING btree (post_id);


--
-- Name: notifications_recipient_created_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_created_id_idx ON public.notifications USING btree (recipient_user_id, created_at DESC, id DESC);


--
-- Name: notifications_recipient_read_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_read_created_idx ON public.notifications USING btree (recipient_user_id, read, created_at DESC);


--
-- Name: notifications_recipient_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_read_idx ON public.notifications USING btree (recipient_user_id, read);


--
-- Name: notifications_unique_follow_actor_recipient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notifications_unique_follow_actor_recipient_idx ON public.notifications USING btree (recipient_user_id, actor_user_id, type) WHERE ((type = 'follow'::text) AND (actor_user_id IS NOT NULL));


--
-- Name: posts_author_created_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_author_created_id_idx ON public.posts USING btree (author_id, created_at DESC, id DESC);


--
-- Name: posts_author_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_author_created_idx ON public.posts USING btree (author_id, created_at DESC);


--
-- Name: posts_category_status_created_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_category_status_created_id_idx ON public.posts USING btree (category, status, created_at DESC, id DESC);


--
-- Name: posts_feed_status_created_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_feed_status_created_id_idx ON public.posts USING btree (status, created_at DESC, id DESC);


--
-- Name: posts_reported_created_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_reported_created_id_idx ON public.posts USING btree (created_at DESC, id DESC) WHERE (status = 'reported'::text);


--
-- Name: profile_follows_follower_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_follows_follower_created_idx ON public.profile_follows USING btree (follower_id, created_at DESC);


--
-- Name: profile_follows_follower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_follows_follower_idx ON public.profile_follows USING btree (follower_id, created_at DESC);


--
-- Name: profile_follows_following_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_follows_following_created_idx ON public.profile_follows USING btree (following_id, created_at DESC);


--
-- Name: profile_follows_following_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_follows_following_idx ON public.profile_follows USING btree (following_id, created_at DESC);


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);


--
-- Name: profiles_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_status_created_idx ON public.profiles USING btree (status, created_at DESC);


--
-- Name: reports_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_user_id_idx ON public.reports USING btree (user_id);


--
-- Name: resources_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resources_created_at_idx ON public.resources USING btree (created_at DESC);


--
-- Name: upvotes_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX upvotes_user_id_idx ON public.upvotes USING btree (user_id);


--
-- Name: comments comment_creates_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comment_creates_notification AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.tg_notify_on_comment();


--
-- Name: comments comments_cache_author; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comments_cache_author BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.tg_cache_comment_author();


--
-- Name: posts posts_cache_author; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER posts_cache_author BEFORE INSERT OR UPDATE OF anonymous, author_id ON public.posts FOR EACH ROW EXECUTE FUNCTION public.tg_cache_author_fields();


--
-- Name: posts posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: profile_follows profile_follows_create_notification_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profile_follows_create_notification_trigger AFTER INSERT ON public.profile_follows FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: reports report_marks_post; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER report_marks_post AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.tg_mark_post_reported();


--
-- Name: profiles trg_profiles_protect_sensitive_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_protect_sensitive_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comments comments_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_follows profile_follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_follows
    ADD CONSTRAINT profile_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profile_follows profile_follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_follows
    ADD CONSTRAINT profile_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: reports reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: upvotes upvotes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upvotes
    ADD CONSTRAINT upvotes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: upvotes upvotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upvotes
    ADD CONSTRAINT upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: visitor_reports visitor_reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_reports
    ADD CONSTRAINT visitor_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: resources Admins can add resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can add resources" ON public.resources FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: resources Admins can delete resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: resources Admins can update resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update resources" ON public.resources FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: resources Anyone can view resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view resources" ON public.resources FOR SELECT USING (true);


--
-- Name: profile_follows Verified users can follow members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verified users can follow members" ON public.profile_follows FOR INSERT TO authenticated WITH CHECK (((auth.uid() = follower_id) AND (follower_id <> following_id) AND public.is_verified_profile(auth.uid()) AND public.is_verified_profile(following_id)));


--
-- Name: profile_follows Verified users can read follow rows involving themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verified users can read follow rows involving themselves" ON public.profile_follows FOR SELECT TO authenticated USING ((public.is_verified_profile(auth.uid()) AND ((auth.uid() = follower_id) OR (auth.uid() = following_id))));


--
-- Name: profile_follows Verified users can unfollow members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verified users can unfollow members" ON public.profile_follows FOR DELETE TO authenticated USING (((auth.uid() = follower_id) AND public.is_verified_profile(auth.uid())));


--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: comments comments: admins can delete any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: admins can delete any" ON public.comments FOR DELETE USING (public.is_admin());


--
-- Name: comments comments: admins can read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: admins can read all" ON public.comments FOR SELECT USING (public.is_admin());


--
-- Name: comments comments: authors can delete their own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: authors can delete their own" ON public.comments FOR DELETE USING ((auth.uid() = author_id));


--
-- Name: comments comments: authors can read their own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: authors can read their own" ON public.comments FOR SELECT USING ((auth.uid() = author_id));


--
-- Name: comments comments: notification recipients can read linked comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: notification recipients can read linked comments" ON public.comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.notifications n
  WHERE ((n.comment_id = comments.id) AND (n.recipient_user_id = auth.uid())))));


--
-- Name: comments comments: post authors can read comments on their posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: post authors can read comments on their posts" ON public.comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = comments.post_id) AND (p.author_id = auth.uid())))));


--
-- Name: comments comments: verified users can create; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comments: verified users can create" ON public.comments FOR INSERT WITH CHECK (((auth.uid() = author_id) AND public.is_verified()));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications: recipients can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: recipients can delete" ON public.notifications FOR DELETE USING ((auth.uid() = recipient_user_id));


--
-- Name: notifications notifications: recipients can mark read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: recipients can mark read" ON public.notifications FOR UPDATE USING ((auth.uid() = recipient_user_id)) WITH CHECK ((auth.uid() = recipient_user_id));


--
-- Name: notifications notifications: recipients can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: recipients can read" ON public.notifications FOR SELECT USING ((auth.uid() = recipient_user_id));


--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: posts posts: admins can delete any post; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: admins can delete any post" ON public.posts FOR DELETE USING (public.is_admin());


--
-- Name: posts posts: admins can read all posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: admins can read all posts" ON public.posts FOR SELECT USING (public.is_admin());


--
-- Name: posts posts: admins can update any post; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: admins can update any post" ON public.posts FOR UPDATE USING (public.is_admin());


--
-- Name: posts posts: authors can delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: authors can delete their own posts" ON public.posts FOR DELETE USING ((auth.uid() = author_id));


--
-- Name: posts posts: authors can read their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: authors can read their own posts" ON public.posts FOR SELECT USING ((auth.uid() = author_id));


--
-- Name: posts posts: authors can update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: authors can update their own posts" ON public.posts FOR UPDATE USING (((auth.uid() = author_id) AND public.is_verified())) WITH CHECK (((auth.uid() = author_id) AND public.is_verified()));


--
-- Name: posts posts: verified users can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "posts: verified users can create posts" ON public.posts FOR INSERT WITH CHECK (((auth.uid() = author_id) AND public.is_verified()));


--
-- Name: profile_follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

--
-- Name: profile_follows profile_follows_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_follows_delete_own ON public.profile_follows FOR DELETE TO authenticated USING ((auth.uid() = follower_id));


--
-- Name: profile_follows profile_follows_insert_own_verified; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_follows_insert_own_verified ON public.profile_follows FOR INSERT TO authenticated WITH CHECK (((auth.uid() = follower_id) AND (follower_id <> following_id) AND public.is_verified_profile(follower_id) AND public.is_verified_profile(following_id)));


--
-- Name: profile_follows profile_follows_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_follows_select_own ON public.profile_follows FOR SELECT TO authenticated USING (((auth.uid() = follower_id) OR (auth.uid() = following_id)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles: admins can delete any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: admins can delete any profile" ON public.profiles FOR DELETE USING (public.is_admin());


--
-- Name: profiles profiles: admins can read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: admins can read all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


--
-- Name: profiles profiles: admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: admins can update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());


--
-- Name: profiles profiles: users can read their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: users can read their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles profiles: users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (role = ( SELECT profiles_1.role
   FROM public.profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))) AND (status = ( SELECT profiles_1.status
   FROM public.profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))) AND (email = ( SELECT profiles_1.email
   FROM public.profiles profiles_1
  WHERE (profiles_1.id = auth.uid())))));


--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reports reports: admins can clear reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reports: admins can clear reports" ON public.reports FOR DELETE USING (public.is_admin());


--
-- Name: reports reports: admins can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reports: admins can read" ON public.reports FOR SELECT USING (public.is_admin());


--
-- Name: reports reports: users can see own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reports: users can see own reports" ON public.reports FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reports reports: verified users can report; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reports: verified users can report" ON public.reports FOR INSERT WITH CHECK (((auth.uid() = user_id) AND public.is_verified()));


--
-- Name: resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

--
-- Name: upvotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;

--
-- Name: upvotes upvotes: admins can read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "upvotes: admins can read all" ON public.upvotes FOR SELECT USING (public.is_admin());


--
-- Name: upvotes upvotes: users can read own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "upvotes: users can read own votes" ON public.upvotes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: upvotes upvotes: users can remove own vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "upvotes: users can remove own vote" ON public.upvotes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: upvotes upvotes: verified users can vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "upvotes: verified users can vote" ON public.upvotes FOR INSERT WITH CHECK (((auth.uid() = user_id) AND public.is_verified()));


--
-- Name: visitor_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitor_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_reports visitor_reports: admins can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "visitor_reports: admins can delete" ON public.visitor_reports FOR DELETE USING (public.is_admin());


--
-- Name: visitor_reports visitor_reports: admins can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "visitor_reports: admins can read" ON public.visitor_reports FOR SELECT USING (public.is_admin());


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION admin_reject_profile(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_reject_profile(p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_reject_profile(p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_reject_profile(p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION admin_revoke_profile(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_revoke_profile(p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_revoke_profile(p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_revoke_profile(p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION admin_revoke_profile_by_email(p_email text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_revoke_profile_by_email(p_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_revoke_profile_by_email(p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_revoke_profile_by_email(p_email text) TO service_role;


--
-- Name: FUNCTION admin_verify_profile_by_email(p_email text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_verify_profile_by_email(p_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_verify_profile_by_email(p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_verify_profile_by_email(p_email text) TO service_role;


--
-- Name: FUNCTION count_post_reports(p_post_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.count_post_reports(p_post_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.count_post_reports(p_post_id uuid) TO anon;
GRANT ALL ON FUNCTION public.count_post_reports(p_post_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.count_post_reports(p_post_id uuid) TO service_role;


--
-- Name: FUNCTION create_comment_safe(p_post_id uuid, p_body text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_comment_safe(p_post_id uuid, p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_comment_safe(p_post_id uuid, p_body text) TO authenticated;
GRANT ALL ON FUNCTION public.create_comment_safe(p_post_id uuid, p_body text) TO service_role;


--
-- Name: FUNCTION create_follow_notification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_follow_notification() TO anon;
GRANT ALL ON FUNCTION public.create_follow_notification() TO authenticated;
GRANT ALL ON FUNCTION public.create_follow_notification() TO service_role;


--
-- Name: FUNCTION create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) TO service_role;


--
-- Name: FUNCTION delete_comment_safe(p_comment_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_comment_safe(p_comment_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_comment_safe(p_comment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_comment_safe(p_comment_id uuid) TO service_role;


--
-- Name: FUNCTION delete_own_post(p_post_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_own_post(p_post_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_own_post(p_post_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_own_post(p_post_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_own_post(p_post_id uuid) TO service_role;


--
-- Name: FUNCTION delete_post(p_post_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.delete_post(p_post_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_post(p_post_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_post(p_post_id uuid) TO service_role;


--
-- Name: FUNCTION get_anonymous_post_label(p_post_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_anonymous_post_label(p_post_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_anonymous_post_label(p_post_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_anonymous_post_label(p_post_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_anonymous_post_label(p_post_id uuid) TO service_role;


--
-- Name: FUNCTION get_public_comments_for_post(target_post_id uuid, limit_count integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_public_comments_for_post(target_post_id uuid, limit_count integer) TO anon;
GRANT ALL ON FUNCTION public.get_public_comments_for_post(target_post_id uuid, limit_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_comments_for_post(target_post_id uuid, limit_count integer) TO service_role;


--
-- Name: FUNCTION get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) TO service_role;


--
-- Name: FUNCTION get_public_profile(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_public_profile(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_public_profile(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_public_profile(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_profile(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_verified(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_verified() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_verified() TO authenticated;
GRANT ALL ON FUNCTION public.is_verified() TO service_role;


--
-- Name: FUNCTION is_verified_profile(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_verified_profile(p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_verified_profile(p_profile_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_verified_profile(p_profile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_verified_profile(p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION list_my_follow_connections(p_list_type text, p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.list_my_follow_connections(p_list_type text, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_my_follow_connections(p_list_type text, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.list_my_follow_connections(p_list_type text, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.list_my_follow_connections(p_list_type text, p_limit integer) TO service_role;


--
-- Name: FUNCTION protect_profile_sensitive_fields(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.protect_profile_sensitive_fields() TO anon;
GRANT ALL ON FUNCTION public.protect_profile_sensitive_fields() TO authenticated;
GRANT ALL ON FUNCTION public.protect_profile_sensitive_fields() TO service_role;


--
-- Name: FUNCTION request_profile_rereview(p_military_email text, p_phone text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.request_profile_rereview(p_military_email text, p_phone text) TO anon;
GRANT ALL ON FUNCTION public.request_profile_rereview(p_military_email text, p_phone text) TO authenticated;
GRANT ALL ON FUNCTION public.request_profile_rereview(p_military_email text, p_phone text) TO service_role;


--
-- Name: FUNCTION restore_reported_post(p_post_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.restore_reported_post(p_post_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.restore_reported_post(p_post_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.restore_reported_post(p_post_id uuid) TO service_role;


--
-- Name: FUNCTION search_verified_profile_by_email(p_email text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.search_verified_profile_by_email(p_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.search_verified_profile_by_email(p_email text) TO anon;
GRANT ALL ON FUNCTION public.search_verified_profile_by_email(p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.search_verified_profile_by_email(p_email text) TO service_role;


--
-- Name: FUNCTION tg_cache_author_fields(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.tg_cache_author_fields() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_cache_author_fields() TO authenticated;
GRANT ALL ON FUNCTION public.tg_cache_author_fields() TO service_role;


--
-- Name: FUNCTION tg_cache_comment_author(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.tg_cache_comment_author() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_cache_comment_author() TO authenticated;
GRANT ALL ON FUNCTION public.tg_cache_comment_author() TO service_role;


--
-- Name: FUNCTION tg_mark_post_reported(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.tg_mark_post_reported() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_mark_post_reported() TO authenticated;
GRANT ALL ON FUNCTION public.tg_mark_post_reported() TO service_role;


--
-- Name: FUNCTION tg_notify_on_comment(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_notify_on_comment() TO anon;
GRANT ALL ON FUNCTION public.tg_notify_on_comment() TO authenticated;
GRANT ALL ON FUNCTION public.tg_notify_on_comment() TO service_role;


--
-- Name: FUNCTION tg_set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.tg_set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.tg_set_updated_at() TO service_role;


--
-- Name: FUNCTION toggle_post_report(p_post_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.toggle_post_report(p_post_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.toggle_post_report(p_post_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.toggle_post_report(p_post_id uuid, p_reason text) TO service_role;


--
-- Name: TABLE comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.comments TO anon;
GRANT ALL ON TABLE public.comments TO authenticated;
GRANT ALL ON TABLE public.comments TO service_role;


--
-- Name: TABLE posts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.posts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.posts TO authenticated;
GRANT ALL ON TABLE public.posts TO service_role;


--
-- Name: COLUMN posts.category; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(category) ON TABLE public.posts TO authenticated;


--
-- Name: COLUMN posts.body; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(body) ON TABLE public.posts TO authenticated;


--
-- Name: COLUMN posts.edited; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(edited) ON TABLE public.posts TO authenticated;


--
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reports TO anon;
GRANT ALL ON TABLE public.reports TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;


--
-- Name: TABLE upvotes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.upvotes TO anon;
GRANT ALL ON TABLE public.upvotes TO authenticated;
GRANT ALL ON TABLE public.upvotes TO service_role;


--
-- Name: TABLE visitor_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.visitor_reports TO service_role;


--
-- Name: TABLE my_posts_with_meta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.my_posts_with_meta TO anon;
GRANT ALL ON TABLE public.my_posts_with_meta TO authenticated;
GRANT ALL ON TABLE public.my_posts_with_meta TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE posts_with_meta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.posts_with_meta TO anon;
GRANT ALL ON TABLE public.posts_with_meta TO authenticated;
GRANT ALL ON TABLE public.posts_with_meta TO service_role;


--
-- Name: TABLE profile_follows; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profile_follows TO anon;
GRANT ALL ON TABLE public.profile_follows TO authenticated;
GRANT ALL ON TABLE public.profile_follows TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE profile_follow_counts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profile_follow_counts TO anon;
GRANT ALL ON TABLE public.profile_follow_counts TO authenticated;
GRANT ALL ON TABLE public.profile_follow_counts TO service_role;


--
-- Name: TABLE public_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.public_profiles TO anon;
GRANT ALL ON TABLE public.public_profiles TO authenticated;
GRANT ALL ON TABLE public.public_profiles TO service_role;


--
-- Name: TABLE resources; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.resources TO anon;
GRANT ALL ON TABLE public.resources TO authenticated;
GRANT ALL ON TABLE public.resources TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict 0G6QBCg2kdJq7Lnd1acQWsbj5kK9wlzWbWbPYLA99bouH4c95tGxreWj4lVoBdX

