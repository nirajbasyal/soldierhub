-- ============================================================================
-- Soldier Hub production fix: profile email search RPC after military_email removal
-- ============================================================================
-- Live production removed public.profiles.military_email, but the older
-- search_verified_profile_by_email RPC can still reference that removed column.
-- This replaces the RPC with the current profile shape: email + personal_email.
-- Safe to run in production. Does not modify table data.
-- ============================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.search_verified_profile_by_email(p_email text)
returns table(
  profile_id uuid,
  full_name text,
  avatar_color text,
  avatar_url text,
  base text
)
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.search_verified_profile_by_email(text) from public;
grant execute on function public.search_verified_profile_by_email(text) to authenticated, service_role;

commit;
