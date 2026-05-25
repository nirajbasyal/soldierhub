-- SoldierHub follow loading optimization
-- Safe to run after 202605150001_profile_follows.sql.
-- Adds one direct follow-summary RPC and upgrades the follow-list RPC with offset pagination.

create index if not exists profile_follows_following_follower_idx
  on public.profile_follows (following_id, follower_id);

create index if not exists profile_follows_follower_following_idx
  on public.profile_follows (follower_id, following_id);

create or replace function public.get_profile_follow_summary(p_profile_id uuid)
returns table (
  profile_id uuid,
  followers_count bigint,
  following_count bigint,
  is_following boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p_profile_id as profile_id,
    coalesce((
      select count(*)
      from public.profile_follows pf
      join public.profiles follower_profile
        on follower_profile.id = pf.follower_id
      where pf.following_id = p_profile_id
        and follower_profile.status = 'verified'
        and follower_profile.verification_status = 'verified'
    ), 0)::bigint as followers_count,
    coalesce((
      select count(*)
      from public.profile_follows pf
      join public.profiles following_profile
        on following_profile.id = pf.following_id
      where pf.follower_id = p_profile_id
        and following_profile.status = 'verified'
        and following_profile.verification_status = 'verified'
    ), 0)::bigint as following_count,
    case
      when auth.uid() is null or auth.uid() = p_profile_id then false
      else exists (
        select 1
        from public.profile_follows pf
        where pf.follower_id = auth.uid()
          and pf.following_id = p_profile_id
      )
    end as is_following
  where exists (
    select 1
    from public.profiles target_profile
    where target_profile.id = p_profile_id
      and target_profile.status = 'verified'
      and target_profile.verification_status = 'verified'
  );
$$;

drop function if exists public.list_my_follow_connections(text, integer);

create or replace function public.list_my_follow_connections(
  p_list_type text default 'followers',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  profile_id uuid,
  full_name text,
  avatar_color text,
  avatar_url text,
  base text,
  followed_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
      with visible_following as (
        select
          p.id as profile_id,
          coalesce(p.full_name, 'SoldierHub member')::text as full_name,
          coalesce(p.avatar_color, '#314A66')::text as avatar_color,
          p.avatar_url::text as avatar_url,
          coalesce(p.base, 'Fort Bliss')::text as base,
          pf.created_at as followed_at,
          count(*) over ()::bigint as total_count
        from public.profile_follows pf
        join public.profiles p
          on p.id = pf.following_id
        where pf.follower_id = auth.uid()
          and p.status = 'verified'
          and p.verification_status = 'verified'
        order by pf.created_at desc
      )
      select *
      from visible_following
      offset safe_offset
      limit safe_limit;

    return;
  end if;

  return query
    with visible_followers as (
      select
        p.id as profile_id,
        coalesce(p.full_name, 'SoldierHub member')::text as full_name,
        coalesce(p.avatar_color, '#314A66')::text as avatar_color,
        p.avatar_url::text as avatar_url,
        coalesce(p.base, 'Fort Bliss')::text as base,
        pf.created_at as followed_at,
        count(*) over ()::bigint as total_count
      from public.profile_follows pf
      join public.profiles p
        on p.id = pf.follower_id
      where pf.following_id = auth.uid()
        and p.status = 'verified'
        and p.verification_status = 'verified'
      order by pf.created_at desc
    )
    select *
    from visible_followers
    offset safe_offset
    limit safe_limit;
end;
$$;

grant execute on function public.get_profile_follow_summary(uuid) to anon, authenticated;
grant execute on function public.list_my_follow_connections(text, integer, integer) to authenticated;
