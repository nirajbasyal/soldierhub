-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- FUNCTIONS continued
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

set check_function_bodies = on;

commit;
