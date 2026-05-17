-- ============================================================================
-- Soldier Hub — Row Level Security Policies
-- ============================================================================
-- Run AFTER schema.sql.
-- RLS is what stops random users from deleting or changing other people's data.
-- ============================================================================

-- ─── Helper: is the current user an admin? ─────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'verified'
  );
$$;

-- ─── Helper: is the current user verified? ─────────────────────────────────
create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'verified'
  );
$$;

-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles: anyone can read verified profiles" on public.profiles;
drop policy if exists "profiles: authenticated users can read verified profiles" on public.profiles;
drop policy if exists "profiles: admins can read all profiles" on public.profiles;
drop policy if exists "profiles: users can read their own profile" on public.profiles;
drop policy if exists "profiles: users can update their own profile" on public.profiles;
drop policy if exists "profiles: admins can update any profile" on public.profiles;
drop policy if exists "profiles: admins can delete any profile" on public.profiles;

-- Profiles table is private. It contains email, role, and status.
-- Public-facing parts should use public.public_profiles or cached post/comment fields.

create policy "profiles: admins can read all profiles"
  on public.profiles
  for select
  using (public.is_admin());

create policy "profiles: users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles: users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
    and email = (select email from public.profiles where id = auth.uid())
  );

create policy "profiles: admins can update any profile"
  on public.profiles
  for update
  using (public.is_admin());

create policy "profiles: admins can delete any profile"
  on public.profiles
  for delete
  using (public.is_admin());

-- ============================================================================
-- posts
-- ============================================================================
alter table public.posts enable row level security;

drop policy if exists "posts: anyone can read active posts" on public.posts;
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
  using (public.is_admin());

create policy "posts: authors can read their own posts"
  on public.posts
  for select
  using (auth.uid() = author_id);

-- No public SELECT policy on public.posts.
-- Logged-out users read public posts through public.get_public_posts().
-- This protects anonymous author_id from direct table queries.

create policy "posts: verified users can create posts"
  on public.posts
  for insert
  with check (
    auth.uid() = author_id
    and public.is_verified()
  );

-- Users can edit only their own posts.
-- Column-level grants below restrict editable fields to body/category/edited.
revoke update on public.posts from anon;
revoke update on public.posts from authenticated;

grant update (body, category, edited) on public.posts to authenticated;

create policy "posts: authors can update their own posts"
  on public.posts
  for update
  using (
    auth.uid() = author_id
    and public.is_verified()
  )
  with check (
    auth.uid() = author_id
    and public.is_verified()
  );

create policy "posts: admins can update any post"
  on public.posts
  for update
  using (public.is_admin());

create policy "posts: authors can delete their own posts"
  on public.posts
  for delete
  using (auth.uid() = author_id);

create policy "posts: admins can delete any post"
  on public.posts
  for delete
  using (public.is_admin());

-- ============================================================================
-- comments
-- ============================================================================
alter table public.comments enable row level security;

drop policy if exists "comments: anyone can read" on public.comments;
drop policy if exists "comments: verified users can create" on public.comments;
drop policy if exists "comments: authors can delete their own" on public.comments;
drop policy if exists "comments: admins can delete any" on public.comments;

create policy "comments: anyone can read"
  on public.comments
  for select
  using (true);

create policy "comments: verified users can create"
  on public.comments
  for insert
  with check (
    auth.uid() = author_id
    and public.is_verified()
  );

create policy "comments: authors can delete their own"
  on public.comments
  for delete
  using (auth.uid() = author_id);

create policy "comments: admins can delete any"
  on public.comments
  for delete
  using (public.is_admin());

-- ============================================================================
-- upvotes
-- ============================================================================
alter table public.upvotes enable row level security;

drop policy if exists "upvotes: anyone can read" on public.upvotes;
drop policy if exists "upvotes: verified users can vote" on public.upvotes;
drop policy if exists "upvotes: users can remove own vote" on public.upvotes;

create policy "upvotes: anyone can read"
  on public.upvotes
  for select
  using (true);

create policy "upvotes: verified users can vote"
  on public.upvotes
  for insert
  with check (
    auth.uid() = user_id
    and public.is_verified()
  );

create policy "upvotes: users can remove own vote"
  on public.upvotes
  for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- reports
-- ============================================================================
alter table public.reports enable row level security;

drop policy if exists "reports: admins can read" on public.reports;
drop policy if exists "reports: users can see own reports" on public.reports;
drop policy if exists "reports: verified users can report" on public.reports;
drop policy if exists "reports: admins can clear reports" on public.reports;

create policy "reports: admins can read"
  on public.reports
  for select
  using (public.is_admin());

create policy "reports: users can see own reports"
  on public.reports
  for select
  using (auth.uid() = user_id);

create policy "reports: verified users can report"
  on public.reports
  for insert
  with check (
    auth.uid() = user_id
    and public.is_verified()
  );

create policy "reports: admins can clear reports"
  on public.reports
  for delete
  using (public.is_admin());

-- ============================================================================
-- visitor_reports
-- ============================================================================
alter table public.visitor_reports enable row level security;

drop policy if exists "visitor_reports: admins can read" on public.visitor_reports;
drop policy if exists "visitor_reports: admins can delete" on public.visitor_reports;

-- No anon/authenticated direct insert/select/update access.
-- Logged-out users report through public.create_visitor_report().
-- Admin restore/delete uses public.restore_reported_post().

create policy "visitor_reports: admins can read"
  on public.visitor_reports
  for select
  using (public.is_admin());

create policy "visitor_reports: admins can delete"
  on public.visitor_reports
  for delete
  using (public.is_admin());

revoke all on public.visitor_reports from anon, authenticated;

-- ============================================================================
-- notifications
-- ============================================================================
alter table public.notifications enable row level security;

drop policy if exists "notifications: recipients can read" on public.notifications;
drop policy if exists "notifications: recipients can mark read" on public.notifications;
drop policy if exists "notifications: recipients can delete" on public.notifications;

create policy "notifications: recipients can read"
  on public.notifications
  for select
  using (auth.uid() = recipient_user_id);

create policy "notifications: recipients can mark read"
  on public.notifications
  for update
  using (auth.uid() = recipient_user_id)
  with check (auth.uid() = recipient_user_id);

create policy "notifications: recipients can delete"
  on public.notifications
  for delete
  using (auth.uid() = recipient_user_id);

-- ============================================================================
-- VIEW GRANTS
-- ============================================================================

-- public_profiles: safe public profile view. No email, role, or status.
grant select on public.public_profiles to anon, authenticated;

-- posts_with_meta: used mainly for authenticated users/admin flows.
-- Logged-out public feed should use public.get_public_posts().
grant select on public.posts_with_meta to anon, authenticated;

-- my_posts_with_meta: signed-in profile/admin use only.
grant select on public.my_posts_with_meta to authenticated;

-- ============================================================================
-- FUNCTION GRANTS
-- ============================================================================

-- Tighten function access first.
revoke all on function public.get_public_posts(int) from public;
revoke all on function public.create_visitor_report(uuid, text, text) from public;
revoke all on function public.restore_reported_post(uuid) from public;

-- Public feed browsing.
grant execute on function public.get_public_posts(int) to anon, authenticated;

-- Logged-out and logged-in users can report through safe RPC.
grant execute on function public.create_visitor_report(uuid, text, text) to anon, authenticated;

-- Only authenticated users can call restore, and the function itself checks admin.
grant execute on function public.restore_reported_post(uuid) to authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
