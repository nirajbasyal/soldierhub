-- ============================================================================
-- Supabase advisor hardening: security views + RLS auth initplan performance
-- ============================================================================
-- Purpose:
--   Fix safe Supabase advisor findings without changing app behavior.
--
-- What this migration does:
--   1. Converts app views to SECURITY INVOKER so RLS/permissions are evaluated
--      as the calling user instead of the view owner.
--   2. Sets a fixed search_path on public.tg_set_updated_at().
--   3. Recreates selected RLS policies to use (select auth.uid()), which avoids
--      per-row auth.uid() re-evaluation at scale.
--
-- What this migration intentionally does NOT do:
--   1. It does not remove public feed/profile/comment RPC EXECUTE grants.
--      Several public SECURITY DEFINER RPCs are likely intentional app endpoints.
--      They need an allowlist review before changing permissions.
--   2. It does not remove unused indexes. On low-traffic apps, useful indexes
--      can appear unused until more production traffic exists.
--
-- Safe run order:
--   Run after:
--     20260606203000_stage2c_drop_profiles_status.sql
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Security advisor: SECURITY DEFINER views
-- --------------------------------------------------------------------------
alter view public.my_posts_with_meta set (security_invoker = true);
alter view public.posts_with_meta set (security_invoker = true);
alter view public.profile_follow_counts set (security_invoker = true);
alter view public.public_profiles set (security_invoker = true);

-- --------------------------------------------------------------------------
-- Security advisor: mutable search_path on trigger function
-- --------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- Performance advisor: auth.uid() initplan fixes for RLS policies
-- --------------------------------------------------------------------------

-- resources admin write policies
drop policy if exists "Admins can add resources" on public.resources;
create policy "Admins can add resources"
on public.resources
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
on public.resources
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
on public.resources
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- upvotes policies
drop policy if exists "upvotes: users can read own votes" on public.upvotes;
create policy "upvotes: users can read own votes"
on public.upvotes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "upvotes: admins can read all" on public.upvotes;
create policy "upvotes: admins can read all"
on public.upvotes
for select
to authenticated
using ((select public.is_admin()));

-- comments read policies
drop policy if exists "comments: authors can read their own" on public.comments;
create policy "comments: authors can read their own"
on public.comments
for select
to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "comments: post authors can read comments on their posts" on public.comments;
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

drop policy if exists "comments: notification recipients can read linked comments" on public.comments;
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

drop policy if exists "comments: admins can read all" on public.comments;
create policy "comments: admins can read all"
on public.comments
for select
to authenticated
using ((select public.is_admin()));

-- profile_follows canonical policies
drop policy if exists profile_follows_select_self_only on public.profile_follows;
create policy profile_follows_select_self_only
on public.profile_follows
for select
to authenticated
using (
  public.is_verified_profile((select auth.uid()))
  and (
    follower_id = (select auth.uid())
    or following_id = (select auth.uid())
  )
);

drop policy if exists profile_follows_insert_own_verified on public.profile_follows;
create policy profile_follows_insert_own_verified
on public.profile_follows
for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and follower_id <> following_id
  and public.is_verified_profile((select auth.uid()))
  and public.is_verified_profile(following_id)
);

drop policy if exists profile_follows_delete_own on public.profile_follows;
create policy profile_follows_delete_own
on public.profile_follows
for delete
to authenticated
using (follower_id = (select auth.uid()));

commit;
