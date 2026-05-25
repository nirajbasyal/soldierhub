-- Soldier Hub RLS privacy hardening
-- Purpose:
-- 1. Remove broad raw-table read access from comments.
-- 2. Remove broad raw-table read access from upvotes.
-- 3. Keep the safe app paths working through SECURITY DEFINER RPCs and narrower RLS.
--
-- Why this matters:
-- Public feed/comments should be read through safe RPCs such as:
-- - public.get_public_posts(...)
-- - public.get_public_comments_for_post(...)
-- - public.get_public_comments_for_posts(...)
--
-- This protects anonymous-post identity from raw table inspection.
-- This migration does not change table data, function bodies, indexes, or views.

-- -----------------------------------------------------------------------------
-- 1. Safety net: make sure narrow comments SELECT policies exist
-- -----------------------------------------------------------------------------
-- Production already has these policies based on the read-only audit.
-- These guarded CREATE POLICY blocks are included so this migration is safer
-- across staging/local environments that may be slightly behind.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'comments: admins can read all'
  ) then
    create policy "comments: admins can read all"
      on public.comments
      for select
      to authenticated
      using ((select public.is_admin()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'comments: authors can read their own'
  ) then
    create policy "comments: authors can read their own"
      on public.comments
      for select
      to authenticated
      using ((select auth.uid()) = author_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'comments: notification recipients can read linked comments'
  ) then
    create policy "comments: notification recipients can read linked comments"
      on public.comments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.notifications n
          where n.comment_id = comments.id
            and n.recipient_user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'comments: post authors can read comments on their posts'
  ) then
    create policy "comments: post authors can read comments on their posts"
      on public.comments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.posts p
          where p.id = comments.post_id
            and p.author_id = (select auth.uid())
        )
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Safety net: make sure narrow upvotes SELECT policies exist
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'upvotes'
      and policyname = 'upvotes: admins can read all'
  ) then
    create policy "upvotes: admins can read all"
      on public.upvotes
      for select
      to authenticated
      using ((select public.is_admin()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'upvotes'
      and policyname = 'upvotes: users can read own votes'
  ) then
    create policy "upvotes: users can read own votes"
      on public.upvotes
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Remove broad public/raw table read policies
-- -----------------------------------------------------------------------------
-- Logged-out users should still be able to read public feed and safe comments
-- through SECURITY DEFINER RPCs, not by reading raw comments/upvotes rows.

-- Before: anon/authenticated could read every raw comment row.
-- After: public comment display continues through safe RPCs that mask anonymous authors.
drop policy if exists "comments: anyone can read" on public.comments;

-- Before: anon/authenticated could read every raw upvote row.
-- After: users can read their own vote state through get_my_feed_viewer_state()
-- or the narrow own-votes policy; admins retain admin read access.
drop policy if exists "upvotes: anyone can read" on public.upvotes;
