-- SoldierHub production hardening: public profile identity helpers
-- Purpose:
-- 1) Keep profiles table private after RLS hardening.
-- 2) Let the feed/profile UI safely display public verified profile identity fields.
-- 3) Avoid many direct frontend reads from profiles/posts_with_meta.

create or replace function public.get_public_profiles_for_ids(p_user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  bio text,
  avatar_color text,
  avatar_url text,
  base text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.get_public_profiles_for_ids(uuid[]) from public;
grant execute on function public.get_public_profiles_for_ids(uuid[]) to anon, authenticated;

create or replace function public.list_public_posts_by_author(
  p_profile_id uuid,
  p_limit integer default 30,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  category text,
  body text,
  anonymous boolean,
  status text,
  edited boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_color text,
  author_avatar_url text,
  upvote_count bigint,
  comment_count bigint,
  report_count bigint,
  image_url text,
  image_key text,
  image_width integer,
  image_height integer,
  image_size integer
)
language sql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.list_public_posts_by_author(uuid, integer, timestamptz, uuid) from public;
grant execute on function public.list_public_posts_by_author(uuid, integer, timestamptz, uuid) to anon, authenticated;
-- Canonical 14-digit migration version; normalized during history reconciliation.
