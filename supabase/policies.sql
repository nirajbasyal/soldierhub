-- ============================================================================
-- Soldier Hub — Row Level Security Policies
-- ============================================================================
-- Run AFTER schema.sql. RLS is what stops random users from deleting other
-- people's data via the API. Without these policies your anon key is a
-- DROP TABLE waiting to happen.
-- ============================================================================

-- ─── Helper: is the current user an admin? ─────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Helper: is the current user verified? ─────────────────────────────────
create or replace function public.is_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'verified'
  );
$$;

-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles: anyone can read verified profiles"          on public.profiles;
drop policy if exists "profiles: authenticated users can read verified profiles" on public.profiles;
drop policy if exists "profiles: admins can read all profiles"               on public.profiles;
drop policy if exists "profiles: users can read their own profile"           on public.profiles;
drop policy if exists "profiles: users can update their own profile"         on public.profiles;
drop policy if exists "profiles: admins can update any profile"              on public.profiles;
drop policy if exists "profiles: admins can delete any profile"              on public.profiles;

-- Profiles table is private. Only the user themselves and admins can read
-- the full row (which contains email and role). Public-facing components
-- should use the `public_profiles` view, which excludes those fields, or
-- the cached fields denormalized into posts / comments / notifications.

-- Admins can see everyone (pending, rejected, verified).
create policy "profiles: admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Users can always read their own profile (regardless of status).
create policy "profiles: users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile, but cannot change role/status/email.
create policy "profiles: users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role   = (select role   from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
    and email  = (select email  from public.profiles where id = auth.uid())
  );

-- Admins can update anyone (used for verifying / rejecting).
create policy "profiles: admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- Admins can delete anyone (used for removing members).
create policy "profiles: admins can delete any profile"
  on public.profiles for delete
  using (public.is_admin());

-- ============================================================================
-- posts
-- ============================================================================
alter table public.posts enable row level security;

drop policy if exists "posts: anyone can read active posts"          on public.posts;
drop policy if exists "posts: admins can read all posts"             on public.posts;
drop policy if exists "posts: authors can read their own posts"      on public.posts;
drop policy if exists "posts: verified users can create posts"       on public.posts;
drop policy if exists "posts: authors can update their own posts"    on public.posts;
drop policy if exists "posts: admins can update any post"            on public.posts;
drop policy if exists "posts: authors can delete their own posts"    on public.posts;
drop policy if exists "posts: admins can delete any post"            on public.posts;

create policy "posts: admins can read all posts"
  on public.posts for select
  using (public.is_admin());

-- Authors can read their own raw posts (needed for my_posts_with_meta and
-- own-edit checks). The view enforces what they actually see.
create policy "posts: authors can read their own posts"
  on public.posts for select
  using (auth.uid() = author_id);

-- Note: there is intentionally NO public SELECT policy on `public.posts`.
-- Anonymous and non-author users must read posts through the
-- `posts_with_meta` view, which masks anonymous author identity. Granting
-- direct SELECT on posts would let a determined user query author_id
-- on anonymous posts and defeat the privacy guarantee.

create policy "posts: verified users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id and public.is_verified());

-- Authors can update their own posts BUT cannot change status, author_id,
-- anonymous, or the cached author fields. This prevents:
--   - Restoring a reported post by direct API call
--   - Transferring ownership
--   - Un-anonymizing a previously anonymous post
-- Status and anonymous changes are admin-only.
create policy "posts: authors can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    and status              = (select status              from public.posts where id = posts.id)
    and author_id           = (select author_id           from public.posts where id = posts.id)
    and anonymous           = (select anonymous           from public.posts where id = posts.id)
    and author_name_cached  is not distinct from (select author_name_cached  from public.posts where id = posts.id)
    and author_color_cached is not distinct from (select author_color_cached from public.posts where id = posts.id)
  );

create policy "posts: admins can update any post"
  on public.posts for update
  using (public.is_admin());

create policy "posts: authors can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

create policy "posts: admins can delete any post"
  on public.posts for delete
  using (public.is_admin());

-- ============================================================================
-- comments
-- ============================================================================
alter table public.comments enable row level security;

drop policy if exists "comments: anyone can read"                  on public.comments;
drop policy if exists "comments: verified users can create"        on public.comments;
drop policy if exists "comments: authors can delete their own"     on public.comments;
drop policy if exists "comments: admins can delete any"            on public.comments;

create policy "comments: anyone can read" on public.comments for select using (true);

create policy "comments: verified users can create"
  on public.comments for insert
  with check (auth.uid() = author_id and public.is_verified());

create policy "comments: authors can delete their own"
  on public.comments for delete
  using (auth.uid() = author_id);

create policy "comments: admins can delete any"
  on public.comments for delete
  using (public.is_admin());

-- ============================================================================
-- upvotes
-- ============================================================================
alter table public.upvotes enable row level security;

drop policy if exists "upvotes: anyone can read"            on public.upvotes;
drop policy if exists "upvotes: verified users can vote"    on public.upvotes;
drop policy if exists "upvotes: users can remove own vote"  on public.upvotes;

create policy "upvotes: anyone can read" on public.upvotes for select using (true);

create policy "upvotes: verified users can vote"
  on public.upvotes for insert
  with check (auth.uid() = user_id and public.is_verified());

create policy "upvotes: users can remove own vote"
  on public.upvotes for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- reports
-- ============================================================================
alter table public.reports enable row level security;

drop policy if exists "reports: admins can read"            on public.reports;
drop policy if exists "reports: users can see own reports"  on public.reports;
drop policy if exists "reports: verified users can report"  on public.reports;
drop policy if exists "reports: admins can clear reports"   on public.reports;

create policy "reports: admins can read" on public.reports for select using (public.is_admin());

create policy "reports: users can see own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "reports: verified users can report"
  on public.reports for insert
  with check (auth.uid() = user_id and public.is_verified());

create policy "reports: admins can clear reports"
  on public.reports for delete
  using (public.is_admin());

-- ============================================================================
-- notifications
-- ============================================================================
alter table public.notifications enable row level security;

drop policy if exists "notifications: recipients can read"       on public.notifications;
drop policy if exists "notifications: recipients can mark read"  on public.notifications;
drop policy if exists "notifications: recipients can delete"     on public.notifications;

create policy "notifications: recipients can read"
  on public.notifications for select
  using (auth.uid() = recipient_user_id);

create policy "notifications: recipients can mark read"
  on public.notifications for update
  using (auth.uid() = recipient_user_id)
  with check (auth.uid() = recipient_user_id);

create policy "notifications: recipients can delete"
  on public.notifications for delete
  using (auth.uid() = recipient_user_id);

-- ============================================================================
-- VIEW GRANTS
-- ============================================================================
-- public_profiles: safe to expose to anonymous users (no email/role/status)
grant select on public.public_profiles to anon, authenticated;

-- posts_with_meta: anonymous users can browse; RLS on underlying tables applies
-- thanks to security_invoker = true on the view definition.
grant select on public.posts_with_meta to anon, authenticated;

-- my_posts_with_meta: only used by signed-in users (profile page, admin
-- reported list). RLS on `posts` enforces who can read what.
grant select on public.my_posts_with_meta to authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
-- Optional next step: run seed.sql to insert demo posts (only useful in dev).
