begin;

create index if not exists profiles_status_created_at_idx
  on public.profiles (status, created_at desc, id desc);

create or replace function public.admin_list_profiles(
  p_queue text default 'pending',
  p_limit integer default 50
)
returns table (
  id uuid,
  full_name text,
  email text,
  personal_email text,
  phone text,
  bio text,
  avatar_color text,
  avatar_url text,
  role text,
  status text,
  verification_status text,
  base text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue text := lower(trim(coalesce(p_queue, 'pending')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if auth.uid() is null then
    raise exception 'Please log in again before loading admin profiles.';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access is required to load profile queues.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.personal_email,
    p.phone,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.role,
    p.status,
    p.verification_status,
    p.base,
    p.created_at,
    p.updated_at
  from public.profiles p
  where
    (v_queue = 'pending' and p.status = 'pending')
    or (v_queue = 'verified' and p.status = 'verified')
    or (v_queue = 'blocked' and p.status in ('rejected', 'revoked'))
  order by p.created_at desc, p.id desc
  limit v_limit;
end;
$$;

grant execute on function public.admin_list_profiles(text, integer) to authenticated;

commit;
