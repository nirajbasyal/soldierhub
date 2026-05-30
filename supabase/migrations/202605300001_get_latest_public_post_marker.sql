-- Soldier Hub production source-of-truth migration.
-- This matches the current live Supabase production function definition.

create or replace function public.get_latest_public_post_marker()
returns table(id uuid, created_at timestamp with time zone)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    p.id,
    p.created_at
  from public.posts p
  where p.status in ('active', 'reported')
  order by p.created_at desc, p.id desc
  limit 1;
$function$;
