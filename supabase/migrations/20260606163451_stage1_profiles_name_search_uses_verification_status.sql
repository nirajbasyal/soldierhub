create or replace function public.search_verified_profiles(
  p_query text,
  p_limit integer default 8,
  p_offset integer default 0
)
returns table(id uuid, full_name text, avatar_color text, avatar_url text, base text, match_type text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_query text := trim(coalesce(p_query, ''));
  clean_query_lower text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 8), 1), 25);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
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
      when looks_like_email and lower(coalesce(p.email, '')) = clean_query_lower then 'email'
      else 'name'
    end::text as match_type
  from public.profiles p
  where p.verification_status = 'verified'
    and (
      (p.full_name is not null and lower(p.full_name) like clean_query_lower || '%')
      or (looks_like_email and p.email is not null and lower(p.email) = clean_query_lower)
    )
  order by
    case when looks_like_email and lower(coalesce(p.email, '')) = clean_query_lower then 0 else 1 end,
    case when lower(coalesce(p.full_name, '')) = clean_query_lower then 0 else 1 end,
    p.full_name asc,
    p.updated_at desc nulls last,
    p.created_at desc nulls last
  offset safe_offset
  limit safe_limit;
end;
$$;
