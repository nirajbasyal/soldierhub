-- ============================================================================
-- SoldierHub production hardening: optimize RLS policies safely
-- ============================================================================
-- Purpose:
--   Improve RLS performance without weakening security.
--
-- What this migration does:
--   1. Keeps existing access behavior.
--   2. Adds explicit TO anon/authenticated roles to policies.
--   3. Wraps stable auth/helper functions with SELECT so Postgres can cache
--      the value per statement instead of evaluating it per row.
--   4. Re-confirms important indexes with IF NOT EXISTS using existing names.
--
-- Safety:
--   - No table drops.
--   - No data deletion.
--   - No column removal.
--   - Transactional: if anything fails, the migration rolls back.
-- ============================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- --------------------------------------------------------------------------
-- Safe index confirmations
-- --------------------------------------------------------------------------
-- These use existing index names already present in the current schema snapshot.
-- If they already exist, these are no-ops. They help if production ever lags
-- behind the repo snapshot.

create index if not exists comments_author_id_idx
  on public.comments using btree (author_id);

create index if not exists comments_post_created_id_idx
  on public.comments using btree (post_id, created_at, id);

create index if not exists posts_author_created_id_idx
  on public.posts using btree (author_id, created_at desc, id desc);

create index if not exists posts_feed_status_created_id_idx
  on public.posts using btree (status, created_at desc, id desc);

create index if not exists posts_category_status_created_id_idx
  on public.posts using btree (category, status, created_at desc, id desc);

create index if not exists reports_user_id_idx
  on public.reports using btree (user_id);

create index if not exists upvotes_user_id_idx
  on public.upvotes using btree (user_id);

create index if not exists notifications_recipient_read_idx
  on public.notifications using btree (recipient_user_id, read);

create index if not exists notifications_recipient_read_created_idx
  on public.notifications using btree (recipient_user_id, read, created_at desc);

create index if not exists profile_follows_follower_idx
  on public.profile_follows using btree (follower_id, created_at desc);

create index if not exists profile_follows_following_idx
  on public.profile_follows using btree (following_id, created_at desc);

-- --------------------------------------------------------------------------
-- profiles RLS
-- --------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles: admins can read all profiles" on public.profiles;
drop policy if exists "profiles: users can read their own profile" on public.profiles;
drop policy if exists "profiles: users can update their own profile" on public.profiles;
drop policy if exists "profiles: admins can update any profile" on public.profiles;
drop policy if exists "profiles: admins can delete any profile" on public.profiles;

create policy "profiles: admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "profiles: users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select current_profile.role from public.profiles current_profile where current_profile.id = (select auth.uid()))
    and status = (select current_profile.status from public.profiles current_profile where current_profile.id = (select auth.uid()))
    and email = (select current_profile.email from public.profiles current_profile where current_profile.id = (select auth.uid()))
  );

create policy "profiles: admins can update any profile"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_admin()));

create policy "profiles: admins can delete any profile"
  on public.profiles
  for delete
  to authenticated
  using ((select public.is_admin()));

-- --------------------------------------------------------------------------
-- posts RLS
-- --------------------------------------------------------------------------

alter table public.posts enable row level security;

drop policy if exists "posts: admins can read all posts" on public.posts;
drop policy if exists "posts: authors can read their own posts" on public.posts;
drop policy if exists "posts: verified users can create posts" on public.posts;
drop policy if exists "posts: authors can update their own posts" on public.posts;
drop policy if exists "posts: admins can update any post" on public.posts;
drop policy if exists "posts: authors can delete their own posts" on public.posts;
drop policy if exists "posts: admins can delete any post" on public.posts;

create policy "posts: admins can read all posts"
  on public.posts
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "posts: authors can read their own posts"
  on public.posts
  for select
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "posts: verified users can create posts"
  on public.posts
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and (select public.is_verified())
  );

revoke update on public.posts from anon;
revoke update on public.posts from authenticated;
grant update (body, category, edited) on public.posts to authenticated;

create policy "posts: authors can update their own posts"
  on public.posts
  for update
  to authenticated
  using (
    (select auth.uid()) = author_id
    and (select public.is_verified())
  )
  with check (
    (select auth.uid()) = author_id
    and (select public.is_verified())
  );

create policy "posts: admins can update any post"
  on public.posts
  for update
  to authenticated
  using ((select public.is_admin()));

create policy "posts: authors can delete their own posts"
  on public.posts
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "posts: admins can delete any post"
  on public.posts
  for delete
  to authenticated
  using ((select public.is_admin()));

-- --------------------------------------------------------------------------
-- comments RLS
-- --------------------------------------------------------------------------

alter table public.comments enable row level security;

drop policy if exists "comments: anyone can read" on public.comments;
drop policy if exists "comments: verified users can create" on public.comments;
drop policy if exists "comments: authors can delete their own" on public.comments;
drop policy if exists "comments: admins can delete any" on public.comments;

create policy "comments: anyone can read"
  on public.comments
  for select
  to anon, authenticated
  using (true);

create policy "comments: verified users can create"
  on public.comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and (select public.is_verified())
  );

create policy "comments: authors can delete their own"
  on public.comments
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "comments: admins can delete any"
  on public.comments
  for delete
  to authenticated
  using ((select public.is_admin()));

-- --------------------------------------------------------------------------
-- upvotes RLS
-- --------------------------------------------------------------------------

alter table public.upvotes enable row level security;

drop policy if exists "upvotes: anyone can read" on public.upvotes;
drop policy if exists "upvotes: verified users can vote" on public.upvotes;
drop policy if exists "upvotes: users can remove own vote" on public.upvotes;

create policy "upvotes: anyone can read"
  on public.upvotes
  for select
  to anon, authenticated
  using (true);

create policy "upvotes: verified users can vote"
  on public.upvotes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.is_verified())
  );

create policy "upvotes: users can remove own vote"
  on public.upvotes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- --------------------------------------------------------------------------
-- reports RLS
-- --------------------------------------------------------------------------

alter table public.reports enable row level security;

drop policy if exists "reports: admins can read" on public.reports;
drop policy if exists "reports: users can see own reports" on public.reports;
drop policy if exists "reports: verified users can report" on public.reports;
drop policy if exists "reports: admins can clear reports" on public.reports;

create policy "reports: admins can read"
  on public.reports
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "reports: users can see own reports"
  on public.reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "reports: verified users can report"
  on public.reports
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.is_verified())
  );

create policy "reports: admins can clear reports"
  on public.reports
  for delete
  to authenticated
  using ((select public.is_admin()));

-- --------------------------------------------------------------------------
-- visitor_reports RLS
-- --------------------------------------------------------------------------

alter table public.visitor_reports enable row level security;

drop policy if exists "visitor_reports: admins can read" on public.visitor_reports;
drop policy if exists "visitor_reports: admins can delete" on public.visitor_reports;

create policy "visitor_reports: admins can read"
  on public.visitor_reports
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "visitor_reports: admins can delete"
  on public.visitor_reports
  for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on public.visitor_reports from anon, authenticated;

-- --------------------------------------------------------------------------
-- notifications RLS
-- --------------------------------------------------------------------------

alter table public.notifications enable row level security;

drop policy if exists "notifications: recipients can read" on public.notifications;
drop policy if exists "notifications: recipients can mark read" on public.notifications;
drop policy if exists "notifications: recipients can delete" on public.notifications;

create policy "notifications: recipients can read"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = recipient_user_id);

create policy "notifications: recipients can mark read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_user_id)
  with check ((select auth.uid()) = recipient_user_id);

create policy "notifications: recipients can delete"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = recipient_user_id);

-- --------------------------------------------------------------------------
-- profile_follows RLS
-- --------------------------------------------------------------------------

alter table public.profile_follows enable row level security;

drop policy if exists "Verified users can read own follow graph" on public.profile_follows;
drop policy if exists "Verified users can follow members" on public.profile_follows;
drop policy if exists "Verified users can unfollow members" on public.profile_follows;

create policy "Verified users can read own follow graph"
  on public.profile_follows
  for select
  to authenticated
  using (
    (select auth.uid()) = follower_id
    or (select auth.uid()) = following_id
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(p.status, p.verification_status) = 'verified'
    )
  );

create policy "Verified users can follow members"
  on public.profile_follows
  for insert
  to authenticated
  with check (
    (select auth.uid()) = follower_id
    and follower_id <> following_id
    and exists (
      select 1
      from public.profiles viewer
      where viewer.id = (select auth.uid())
        and coalesce(viewer.status, viewer.verification_status) = 'verified'
    )
    and exists (
      select 1
      from public.profiles target
      where target.id = following_id
        and coalesce(target.status, target.verification_status) = 'verified'
    )
  );

create policy "Verified users can unfollow members"
  on public.profile_follows
  for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- --------------------------------------------------------------------------
-- Preserve grants used by the app
-- --------------------------------------------------------------------------

grant select on public.public_profiles to anon, authenticated;
grant select on public.posts_with_meta to anon, authenticated;
grant select on public.my_posts_with_meta to authenticated;
grant select, insert, delete on public.profile_follows to authenticated;

commit;
