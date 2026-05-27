-- ============================================================================
-- Soldier Hub performance fix: faster follower / following counts and lists
-- ============================================================================
-- Purpose:
--   Make profile follower/following counts and the follower/following list load
--   faster without exposing private data.
--
-- Safety model:
--   - Follow summary only returns counts for verified profiles.
--   - Follow list only returns the signed-in user's own follower/following list.
--   - The list function requires a verified account.
--   - SECURITY DEFINER functions use a fixed search_path.
--   - PUBLIC and anon execution are explicitly revoked for authenticated-only RPCs.
-- ============================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create index if not exists profile_follows_following_created_follower_idx
  on public.profile_follows (following_id, created_at desc, follower_id);

create index if not exists profile_follows_follower_created_following_idx
  on public.profile_follows (follower_id, created_at desc, following_id);

create index if not exists profiles_verified_lookup_idx
  on public.profiles (id)
  where status = 'verified' and verification_status = 'verified';

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
$$;

-- Replace the offset-paginated list RPC. It intentionally avoids count(*) over()
-- because the profile page already has the total counts from get_profile_follow_summary.
-- Returning one extra row lets the client know whether more rows exist.
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
$$;

revoke all on function public.get_profile_follow_summary(uuid) from public;
revoke all on function public.get_profile_follow_summary(uuid) from anon;
revoke all on function public.list_my_follow_connections(text, integer, integer) from public;
revoke all on function public.list_my_follow_connections(text, integer, integer) from anon;

grant execute on function public.get_profile_follow_summary(uuid) to authenticated;
grant execute on function public.list_my_follow_connections(text, integer, integer) to authenticated;

commit;
