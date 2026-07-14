-- SoldierHub production optimization: load notification cards with one safe RPC.
-- Goal: reduce frontend fan-out reads to notifications + posts + comments + profiles.
-- Safe to run more than once.

begin;

create or replace function public.list_my_notifications_hydrated(
  p_limit integer default 30,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_notification_ids uuid[] default null
)
returns table (
  id uuid,
  recipient_user_id uuid,
  actor_user_id uuid,
  actor_id uuid,
  actor_name_cached text,
  actor_color_cached text,
  actor_avatar_url text,
  type text,
  post_id uuid,
  comment_id uuid,
  read boolean,
  created_at timestamptz,
  post_title_cached text,
  post_preview_cached text,
  comment_body_cached text,
  post jsonb,
  comment jsonb,
  actor_profile jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) from public;
revoke all on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) from anon;
grant execute on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) to authenticated;

comment on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) is
  'Returns hydrated notification cards for the current verified user without exposing raw notification/comment/profile tables to the frontend.';

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
