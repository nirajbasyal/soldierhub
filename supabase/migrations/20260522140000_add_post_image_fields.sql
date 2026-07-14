alter table public.posts
  add column if not exists image_url text,
  add column if not exists image_key text,
  add column if not exists image_width integer,
  add column if not exists image_height integer,
  add column if not exists image_size integer;

create index if not exists idx_posts_image_key
  on public.posts (image_key)
  where image_key is not null;

drop function if exists public.get_public_posts(integer, timestamp with time zone, uuid);

create function public.get_public_posts(
  limit_count integer default 50,
  cursor_created_at timestamp with time zone default null::timestamp with time zone,
  cursor_id uuid default null::uuid
)
returns table(
  id uuid,
  author_id uuid,
  category text,
  body text,
  anonymous boolean,
  status text,
  edited boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_name text,
  author_color text,
  upvote_count bigint,
  comment_count bigint,
  report_count bigint,
  image_url text,
  image_key text,
  image_width integer,
  image_height integer,
  image_size integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    case when p.anonymous then null else p.author_id end as author_id,
    p.category,
    p.body,
    p.anonymous,
    p.status,
    p.edited,
    p.created_at,
    p.updated_at,
    case when p.anonymous then null else p.author_name_cached end as author_name,
    case when p.anonymous then null else p.author_color_cached end as author_color,
    coalesce((
      select count(*)
      from public.upvotes u
      where u.post_id = p.id
    ), 0) as upvote_count,
    coalesce((
      select count(*)
      from public.comments c
      where c.post_id = p.id
        and c.deleted_at is null
    ), 0) as comment_count,
    (
      coalesce((
        select count(*)
        from public.reports r
        where r.post_id = p.id
      ), 0)
      +
      coalesce((
        select count(*)
        from public.visitor_reports vr
        where vr.post_id = p.id
      ), 0)
    ) as report_count,
    p.image_url,
    p.image_key,
    p.image_width,
    p.image_height,
    p.image_size
  from public.posts p
  where p.status in ('active', 'reported')
    and (
      cursor_created_at is null
      or cursor_id is null
      or (p.created_at, p.id) < (cursor_created_at, cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit greatest(1, least(limit_count, 50));
$$;

grant execute on function public.get_public_posts(integer, timestamp with time zone, uuid) to anon, authenticated;

create or replace function public.count_post_reports(p_post_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(
      (select count(*) from public.reports r where r.post_id = p_post_id),
      0
    )
    +
    coalesce(
      (
        select count(*)
        from public.visitor_reports vr
        where vr.post_id = p_post_id
      ),
      0
    );
$$;

create or replace view public.posts_with_meta
with (security_invoker='true') as
select
  p.id,
  case when p.anonymous then null::uuid else p.author_id end as author_id,
  p.category,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  case when p.anonymous then null::text else p.author_name_cached end as author_name,
  case when p.anonymous then null::text else p.author_color_cached end as author_color,
  coalesce((
    select count(*)
    from public.upvotes u
    where u.post_id = p.id
  ), 0::bigint) as upvote_count,
  coalesce((
    select count(*)
    from public.comments c
    where c.post_id = p.id
      and c.deleted_at is null
  ), 0::bigint) as comment_count,
  public.count_post_reports(p.id) as report_count,
  p.image_url,
  p.image_key,
  p.image_width,
  p.image_height,
  p.image_size
from public.posts p
where p.status = any (array['active'::text, 'reported'::text]);

create or replace view public.my_posts_with_meta
with (security_invoker='true') as
select
  p.id,
  p.author_id,
  p.category,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  p.author_name_cached as author_name,
  p.author_color_cached as author_color,
  coalesce((
    select count(*)
    from public.upvotes u
    where u.post_id = p.id
  ), 0::bigint) as upvote_count,
  coalesce((
    select count(*)
    from public.comments c
    where c.post_id = p.id
      and c.deleted_at is null
  ), 0::bigint) as comment_count,
  public.count_post_reports(p.id) as report_count,
  p.image_url,
  p.image_key,
  p.image_width,
  p.image_height,
  p.image_size
from public.posts p;
