-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- ENABLE ROW LEVEL SECURITY
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.posts enable row level security;
alter table public.profile_follows enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.resources enable row level security;
alter table public.upvotes enable row level security;
alter table public.visitor_reports enable row level security;

-- ROW LEVEL SECURITY POLICIES
drop policy if exists "comments: admins can delete any" on public.comments;
create policy "comments: admins can delete any"
  on public.comments
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "comments: admins can read all" on public.comments;
create policy "comments: admins can read all"
  on public.comments
  as permissive
  for select
  to public
  using (is_admin());

drop policy if exists "comments: authors can delete their own" on public.comments;
create policy "comments: authors can delete their own"
  on public.comments
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = author_id));

drop policy if exists "comments: authors can read their own" on public.comments;
create policy "comments: authors can read their own"
  on public.comments
  as permissive
  for select
  to public
  using ((auth.uid() = author_id));

drop policy if exists "comments: notification recipients can read linked comments" on public.comments;
create policy "comments: notification recipients can read linked comments"
  on public.comments
  as permissive
  for select
  to public
  using ((EXISTS ( SELECT 1
   FROM notifications n
  WHERE ((n.comment_id = comments.id) AND (n.recipient_user_id = auth.uid())))));

drop policy if exists "comments: post authors can read comments on their posts" on public.comments;
create policy "comments: post authors can read comments on their posts"
  on public.comments
  as permissive
  for select
  to public
  using ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = comments.post_id) AND (p.author_id = auth.uid())))));

drop policy if exists "comments: verified users can create" on public.comments;
create policy "comments: verified users can create"
  on public.comments
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "notifications: recipients can delete" on public.notifications;
create policy "notifications: recipients can delete"
  on public.notifications
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_user_id));

drop policy if exists "notifications: recipients can mark read" on public.notifications;
create policy "notifications: recipients can mark read"
  on public.notifications
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_user_id))
  with check ((( SELECT auth.uid() AS uid) = recipient_user_id));

drop policy if exists "notifications: recipients can read" on public.notifications;
create policy "notifications: recipients can read"
  on public.notifications
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_user_id));

drop policy if exists "posts: admins can delete any post" on public.posts;
create policy "posts: admins can delete any post"
  on public.posts
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "posts: admins can read all posts" on public.posts;
create policy "posts: admins can read all posts"
  on public.posts
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "posts: admins can update any post" on public.posts;
create policy "posts: admins can update any post"
  on public.posts
  as permissive
  for update
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "posts: authors can delete their own posts" on public.posts;
create policy "posts: authors can delete their own posts"
  on public.posts
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = author_id));

drop policy if exists "posts: authors can read their own posts" on public.posts;
create policy "posts: authors can read their own posts"
  on public.posts
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = author_id));

drop policy if exists "posts: authors can update their own posts" on public.posts;
create policy "posts: authors can update their own posts"
  on public.posts
  as permissive
  for update
  to authenticated
  using (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)))
  with check (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "posts: verified users can create posts" on public.posts;
create policy "posts: verified users can create posts"
  on public.posts
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = author_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "Verified users can follow members" on public.profile_follows;
create policy "Verified users can follow members"
  on public.profile_follows
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = follower_id) AND (follower_id <> following_id) AND (EXISTS ( SELECT 1
   FROM profiles viewer
  WHERE ((viewer.id = ( SELECT auth.uid() AS uid)) AND (COALESCE(viewer.status, viewer.verification_status) = 'verified'::text)))) AND (EXISTS ( SELECT 1
   FROM profiles target
  WHERE ((target.id = profile_follows.following_id) AND (COALESCE(target.status, target.verification_status) = 'verified'::text))))));

drop policy if exists "Verified users can read follow rows involving themselves" on public.profile_follows;
create policy "Verified users can read follow rows involving themselves"
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using ((is_verified_profile(auth.uid()) AND ((auth.uid() = follower_id) OR (auth.uid() = following_id))));

drop policy if exists "Verified users can read own follow graph" on public.profile_follows;
create policy "Verified users can read own follow graph"
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using (((( SELECT auth.uid() AS uid) = follower_id) OR (( SELECT auth.uid() AS uid) = following_id) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (COALESCE(p.status, p.verification_status) = 'verified'::text))))));

drop policy if exists "Verified users can unfollow members" on public.profile_follows;
create policy "Verified users can unfollow members"
  on public.profile_follows
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = follower_id));

drop policy if exists profile_follows_delete_own on public.profile_follows;
create policy profile_follows_delete_own
  on public.profile_follows
  as permissive
  for delete
  to authenticated
  using ((auth.uid() = follower_id));

drop policy if exists profile_follows_insert_own_verified on public.profile_follows;
create policy profile_follows_insert_own_verified
  on public.profile_follows
  as permissive
  for insert
  to authenticated
  with check (((auth.uid() = follower_id) AND (follower_id <> following_id) AND is_verified_profile(follower_id) AND is_verified_profile(following_id)));

drop policy if exists profile_follows_select_own on public.profile_follows;
create policy profile_follows_select_own
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using (((auth.uid() = follower_id) OR (auth.uid() = following_id)));

drop policy if exists "profiles: admins can delete any profile" on public.profiles;
create policy "profiles: admins can delete any profile"
  on public.profiles
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "profiles: admins can read all profiles" on public.profiles;
create policy "profiles: admins can read all profiles"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "profiles: admins can update any profile" on public.profiles;
create policy "profiles: admins can update any profile"
  on public.profiles
  as permissive
  for update
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "profiles: users can read their own profile" on public.profiles;
create policy "profiles: users can read their own profile"
  on public.profiles
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id));

drop policy if exists "profiles: users can update their own profile" on public.profiles;
create policy "profiles: users can update their own profile"
  on public.profiles
  as permissive
  for update
  to authenticated
  using ((( SELECT auth.uid() AS uid) = id))
  with check ((( SELECT auth.uid() AS uid) = id));

drop policy if exists "reports: admins can clear reports" on public.reports;
create policy "reports: admins can clear reports"
  on public.reports
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "reports: admins can read" on public.reports;
create policy "reports: admins can read"
  on public.reports
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "reports: users can see own reports" on public.reports;
create policy "reports: users can see own reports"
  on public.reports
  as permissive
  for select
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

drop policy if exists "reports: verified users can report" on public.reports;
create policy "reports: verified users can report"
  on public.reports
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "Admins can add resources" on public.resources;
create policy "Admins can add resources"
  on public.resources
  as permissive
  for insert
  to public
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources"
  on public.resources
  as permissive
  for delete
  to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "Admins can update resources" on public.resources;
create policy "Admins can update resources"
  on public.resources
  as permissive
  for update
  to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

drop policy if exists "Anyone can view resources" on public.resources;
create policy "Anyone can view resources"
  on public.resources
  as permissive
  for select
  to public
  using (true);

drop policy if exists "upvotes: admins can read all" on public.upvotes;
create policy "upvotes: admins can read all"
  on public.upvotes
  as permissive
  for select
  to public
  using (is_admin());

drop policy if exists "upvotes: users can read own votes" on public.upvotes;
create policy "upvotes: users can read own votes"
  on public.upvotes
  as permissive
  for select
  to public
  using ((auth.uid() = user_id));

drop policy if exists "upvotes: users can remove own vote" on public.upvotes;
create policy "upvotes: users can remove own vote"
  on public.upvotes
  as permissive
  for delete
  to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

drop policy if exists "upvotes: verified users can vote" on public.upvotes;
create policy "upvotes: verified users can vote"
  on public.upvotes
  as permissive
  for insert
  to authenticated
  with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT is_verified() AS is_verified)));

drop policy if exists "visitor_reports: admins can delete" on public.visitor_reports;
create policy "visitor_reports: admins can delete"
  on public.visitor_reports
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin() AS is_admin));

drop policy if exists "visitor_reports: admins can read" on public.visitor_reports;
create policy "visitor_reports: admins can read"
  on public.visitor_reports
  as permissive
  for select
  to authenticated
  using (( SELECT is_admin() AS is_admin));

set check_function_bodies = on;

commit;
