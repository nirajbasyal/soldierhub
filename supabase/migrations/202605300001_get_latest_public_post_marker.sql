-- Soldier Hub production source-of-truth migration.
-- Adds the lightweight marker RPC used by the feed to detect whether newer public posts exist.
-- This function is safe to re-run and does not change table data.

create or replace function public.get_latest_public_post_marker()
returns table (
  latest_post_id uuid,
  latest_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as latest_post_id,
    p.created_at as latest_created_at
  from public.posts p
  where p.status in ('active', 'reported')
  order by p.created_at desc, p.id desc
  limit 1;
$$;

grant execute on function public.get_latest_public_post_marker() to anon, authenticated;
