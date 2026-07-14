create or replace function public.find_verified_profile_by_email(p_email text)
returns table(id uuid, full_name text, avatar_color text, avatar_url text, base text)
language plpgsql
stable
security definer
set search_path = public
as $$
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
  where p.verification_status = 'verified'
    and (
      lower(coalesce(p.email, '')) = clean_email
      or lower(coalesce(p.personal_email, '')) = clean_email
    )
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;
end;
$$;
