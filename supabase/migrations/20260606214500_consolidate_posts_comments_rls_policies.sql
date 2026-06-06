-- Consolidate multiple permissive RLS policies on public.posts and public.comments.
-- This keeps the same access model but reduces duplicate PERMISSIVE policies
-- per table/action for better performance and easier production audits.

begin;

-- --------------------------------------------------------------------------
-- public.comments
-- --------------------------------------------------------------------------

drop policy if exists "comments: admins can read all" on public.comments;
drop policy if exists "comments: authors can read their own" on public.comments;
drop policy if exists "comments: post authors can read comments on their posts" on public.comments;
drop policy if exists "comments: notification recipients can read linked comments" on public.comments;

create policy "comments: authenticated read allowed"
on public.comments
for select
to authenticated
using (
  (select public.is_admin())
  or author_id = (select auth.uid())
  or exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and p.author_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.notifications n
    where n.comment_id = comments.id
      and n.recipient_user_id = (select auth.uid())
  )
);

drop policy if exists "comments: admins can delete any" on public.comments;
drop policy if exists "comments: authors can delete their own" on public.comments;

create policy "comments: authenticated delete allowed"
on public.comments
for delete
to authenticated
using (
  (select public.is_admin())
  or author_id = (select auth.uid())
);

-- Keep existing INSERT policy because it is already single-policy and clear.

-- --------------------------------------------------------------------------
-- public.posts
-- --------------------------------------------------------------------------

drop policy if exists "posts: admins can read all posts" on public.posts;
drop policy if exists "posts: authors can read their own posts" on public.posts;

create policy "posts: authenticated read allowed"
on public.posts
for select
to authenticated
using (
  (select public.is_admin())
  or author_id = (select auth.uid())
);

drop policy if exists "posts: admins can delete any post" on public.posts;
drop policy if exists "posts: authors can delete their own posts" on public.posts;

create policy "posts: authenticated delete allowed"
on public.posts
for delete
to authenticated
using (
  (select public.is_admin())
  or author_id = (select auth.uid())
);

drop policy if exists "posts: admins can update any post" on public.posts;
drop policy if exists "posts: authors can update their own posts" on public.posts;

create policy "posts: authenticated update allowed"
on public.posts
for update
to authenticated
using (
  (select public.is_admin())
  or (
    author_id = (select auth.uid())
    and (select public.is_verified())
  )
)
with check (
  (select public.is_admin())
  or (
    author_id = (select auth.uid())
    and (select public.is_verified())
  )
);

-- Keep existing INSERT policy because it is already single-policy and clear.

commit;
