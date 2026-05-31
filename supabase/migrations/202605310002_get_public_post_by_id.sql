-- ============================================================================
-- get_public_post(p_id uuid)
-- ----------------------------------------------------------------------------
-- Returns a single active post for anonymous/logged-out readers.
--
-- Why this exists:
--   public.posts has no anonymous SELECT policy and public.posts_with_meta
--   runs with security_invoker, so logged-out clients (and, critically,
--   search-engine / social crawlers requesting /post/[id]) cannot read a post
--   directly. The feed already uses the security-definer get_public_posts()
--   RPC for the same reason; this is its single-row counterpart, used by the
--   server-side generateMetadata() to emit per-post title/description/OG tags.
--
-- Only 'active' posts are returned; deleted/removed/reported-hidden posts and
-- anything else stay invisible to anonymous callers.
-- ============================================================================

create or replace function public.get_public_post(p_id uuid)
returns table (
  id uuid,
  author_id uuid,
  category text,
  body text,
  anonymous boolean,
  status text,
  edited boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_color text,
  upvote_count bigint,
  comment_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
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
    p.upvote_count,
    p.comment_count
  from public.posts p
  where p.id = p_id
    and p.status = 'active'
  limit 1;
$$;

revoke all on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_post(uuid) to anon, authenticated;
