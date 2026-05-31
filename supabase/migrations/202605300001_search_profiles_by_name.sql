begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create index if not exists profiles_verified_full_name_lower_idx
  on public.profiles (lower(full_name))
  where status = 'verified' and verification_status = 'verified';

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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_query text := trim(coalesce(p_query, ''));
  safe_limit integer := least(greatest(coalesce(p_limit, 8), 1), 12);
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
      coalesce(p.base, 'Fort Bliss')::text as base
    from public.profiles p
    where p.status = 'verified'
      and p.verification_status = 'verified'
      and p.full_name is not null
      and lower(p.full_name) like lower(clean_query) || '%'
    order by
      case when lower(p.full_name) = lower(clean_query) then 0 else 1 end,
      p.full_name asc,
      p.updated_at desc nulls last,
      p.created_at desc nulls last
    limit safe_limit;
end;
$$;

revoke all on function public.search_verified_profiles_by_name(text, integer) from public;
revoke all on function public.search_verified_profiles_by_name(text, integer) from anon;
grant execute on function public.search_verified_profiles_by_name(text, integer) to authenticated;

commit;
