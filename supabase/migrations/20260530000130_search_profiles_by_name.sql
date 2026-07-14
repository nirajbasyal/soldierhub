begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create index if not exists profiles_verified_full_name_lower_idx
  on public.profiles (lower(full_name))
  where status = 'verified' and verification_status = 'verified';

create index if not exists profiles_verified_email_lower_idx
  on public.profiles (lower(email))
  where status = 'verified' and verification_status = 'verified';

create or replace function public.search_verified_profiles(
  p_query text,
  p_limit integer default 8
)
returns table (
  id uuid,
  full_name text,
  avatar_color text,
  avatar_url text,
  base text,
  match_type text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_query text := trim(coalesce(p_query, ''));
  clean_query_lower text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 8), 1), 12);
  looks_like_email boolean := trim(coalesce(p_query, '')) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$';
begin
  if auth.uid() is null then
    raise exception 'Please sign in before searching member profiles.';
  end if;

  if not public.is_verified_profile(auth.uid()) then
    raise exception 'Verified account required to search member profiles.';
  end if;

  if length(clean_query) < 2 then
    return;
  end if;

  return query
    select
      p.id,
      coalesce(p.full_name, 'SoldierHub member')::text as full_name,
      coalesce(p.avatar_color, '#314A66')::text as avatar_color,
      p.avatar_url::text as avatar_url,
      coalesce(p.base, 'Fort Bliss')::text as base,
      case
        when looks_like_email and lower(p.email) = clean_query_lower then 'email'
        else 'name'
      end::text as match_type
    from public.profiles p
    where p.status = 'verified'
      and p.verification_status = 'verified'
      and (
        (p.full_name is not null and lower(p.full_name) like clean_query_lower || '%')
        or
        (looks_like_email and p.email is not null and lower(p.email) = clean_query_lower)
      )
    order by
      case when looks_like_email and lower(p.email) = clean_query_lower then 0 else 1 end,
      case when lower(p.full_name) = clean_query_lower then 0 else 1 end,
      p.full_name asc,
      p.updated_at desc nulls last,
      p.created_at desc nulls last
    limit safe_limit;
end;
$$;

create or replace function public.search_verified_profiles_by_name(
  p_query text,
  p_limit integer default 8
)
returns table (
  id uuid,
  full_name text,
  avatar_color text,
  avatar_url text,
  base text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.full_name, s.avatar_color, s.avatar_url, s.base
  from public.search_verified_profiles(p_query, p_limit) s;
$$;

revoke all on function public.search_verified_profiles(text, integer) from public;
revoke all on function public.search_verified_profiles(text, integer) from anon;
grant execute on function public.search_verified_profiles(text, integer) to authenticated;

revoke all on function public.search_verified_profiles_by_name(text, integer) from public;
revoke all on function public.search_verified_profiles_by_name(text, integer) from anon;
grant execute on function public.search_verified_profiles_by_name(text, integer) to authenticated;

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
