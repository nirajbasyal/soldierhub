-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- FUNCTIONS continued
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

set check_function_bodies = on;

commit;
