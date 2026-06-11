-- Adds author_avatar_url to get_public_posts so the feed renders avatars from a
-- single RPC. The client (src/lib/db/posts.js attachProfilesToPosts) already
-- skips the second get_public_profiles_for_ids round trip for rows that include
-- author_avatar_url, so this change removes one network round trip from every
-- feed load and pagination page with no client code change.
--
-- A return-type change requires DROP + CREATE (grants are restored below).
-- Privacy semantics match get_public_profiles_for_ids: avatar is exposed only
-- for verified, non-anonymous authors.
--
-- Rollback: re-create the previous function definition (identical except
-- without the author_avatar_url column and the profiles join) and re-grant
-- execute to anon, authenticated.

drop function if exists public.get_public_posts(integer, timestamp with time zone, uuid);

create function public.get_public_posts(
  limit_count integer default 50,
  cursor_created_at timestamp with time zone default null,
  cursor_id uuid default null
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
  image_size integer,
  image_thumbnail_url text,
  image_thumbnail_key text,
  image_thumbnail_width integer,
  image_thumbnail_height integer,
  image_thumbnail_size integer,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
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
    coalesce(p.upvote_count, 0)::bigint as upvote_count,
    coalesce(p.comment_count, 0)::bigint as comment_count,
    coalesce(p.report_count, 0)::bigint as report_count,
    p.image_url,
    p.image_key,
    p.image_width,
    p.image_height,
    p.image_size,
    p.image_thumbnail_url,
    p.image_thumbnail_key,
    p.image_thumbnail_width,
    p.image_thumbnail_height,
    p.image_thumbnail_size,
    case when p.anonymous then null else pr.avatar_url end as author_avatar_url
  from public.posts p
  left join public.profiles pr
    on pr.id = p.author_id
   and pr.verification_status = 'verified'
  where p.status in ('active', 'reported')
    and (
      cursor_created_at is null
      or cursor_id is null
      or (p.created_at, p.id) < (cursor_created_at, cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit greatest(1, least(limit_count, 50));
$$;

revoke all on function public.get_public_posts(integer, timestamp with time zone, uuid) from public;
grant execute on function public.get_public_posts(integer, timestamp with time zone, uuid) to anon, authenticated;
