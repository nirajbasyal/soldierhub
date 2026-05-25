-- SoldierHub production optimization: scoped feed viewer state
-- Purpose:
--   Avoid loading a user's full upvote/report history on app startup.
--   The app now asks only: "For these visible feed posts, which ones did I upvote/report?"
-- Safety:
--   - Adds a new read-only SECURITY DEFINER RPC.
--   - Does not alter existing tables, views, policies, or data.
--   - Keeps permissions narrow: authenticated users only.

create or replace function public.get_my_feed_viewer_state(p_post_ids uuid[])
returns table (
  upvoted_post_ids uuid[],
  reported_post_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      array(
        select u.post_id
        from public.upvotes u
        where u.user_id = auth.uid()
          and u.post_id = any(coalesce(p_post_ids, array[]::uuid[]))
      ),
      array[]::uuid[]
    ) as upvoted_post_ids,
    coalesce(
      array(
        select r.post_id
        from public.reports r
        where r.user_id = auth.uid()
          and r.post_id = any(coalesce(p_post_ids, array[]::uuid[]))
      ),
      array[]::uuid[]
    ) as reported_post_ids;
$$;

revoke all on function public.get_my_feed_viewer_state(uuid[]) from public;
grant execute on function public.get_my_feed_viewer_state(uuid[]) to authenticated;

comment on function public.get_my_feed_viewer_state(uuid[]) is
  'Returns viewer-specific upvote/report state only for the supplied visible feed post ids.';
