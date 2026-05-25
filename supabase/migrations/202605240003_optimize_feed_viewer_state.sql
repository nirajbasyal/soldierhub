-- SoldierHub production optimization: scoped feed viewer state
-- Purpose:
--   Avoid loading a user's full upvote/report history on app startup.
--   The app now asks only:
--   "For these visible feed posts, which ones did I upvote/report?"
--
-- Safety:
--   - Read-only function.
--   - Does not alter existing tables, views, policies, or data.
--   - Only returns the logged-in user's own upvote/report state.
--   - Limits input to 100 post IDs to prevent abuse.

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
  with safe_input as (
    select array(
      select distinct post_id
      from unnest(coalesce(p_post_ids, array[]::uuid[])) as input(post_id)
      where post_id is not null
      limit 100
    ) as post_ids
  )
  select
    coalesce(
      array(
        select distinct u.post_id
        from public.upvotes u
        cross join safe_input si
        where auth.uid() is not null
          and u.user_id = auth.uid()
          and u.post_id = any(si.post_ids)
      ),
      array[]::uuid[]
    ) as upvoted_post_ids,
    coalesce(
      array(
        select distinct r.post_id
        from public.reports r
        cross join safe_input si
        where auth.uid() is not null
          and r.user_id = auth.uid()
          and r.post_id = any(si.post_ids)
      ),
      array[]::uuid[]
    ) as reported_post_ids;
$$;

revoke all on function public.get_my_feed_viewer_state(uuid[]) from public;
grant execute on function public.get_my_feed_viewer_state(uuid[]) to authenticated;

comment on function public.get_my_feed_viewer_state(uuid[]) is
  'Returns viewer-specific upvote/report state only for the supplied visible feed post ids. Input is capped to 100 ids.';
