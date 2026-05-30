-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- SCHEMA GRANTS
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

-- TABLE GRANTS
grant DELETE, INSERT, SELECT on table public.comments to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.comments to service_role;
grant SELECT on table public.my_posts_with_meta to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.my_posts_with_meta to service_role;
grant DELETE, SELECT, UPDATE on table public.notifications to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.notifications to service_role;
grant DELETE, INSERT, SELECT on table public.posts to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts to service_role;
grant SELECT on table public.posts_with_meta to anon;
grant SELECT on table public.posts_with_meta to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts_with_meta to service_role;
grant SELECT on table public.profile_follow_counts to anon;
grant SELECT on table public.profile_follow_counts to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profile_follow_counts to service_role;
grant DELETE, INSERT, SELECT on table public.profile_follows to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profile_follows to service_role;
grant DELETE, SELECT, UPDATE on table public.profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profiles to service_role;
grant SELECT on table public.public_profiles to anon;
grant SELECT on table public.public_profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.public_profiles to service_role;
grant DELETE, INSERT, SELECT on table public.reports to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.reports to service_role;
grant SELECT on table public.resources to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.resources to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.resources to service_role;
grant DELETE, INSERT, SELECT on table public.upvotes to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.upvotes to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visitor_reports to service_role;

-- SEQUENCE GRANTS
-- No public sequence grants found.

-- FUNCTION GRANTS
grant execute on function public.admin_list_profiles(p_queue text, p_limit integer) to authenticated;
grant execute on function public.admin_list_profiles(p_queue text, p_limit integer) to service_role;
grant execute on function public.admin_reject_profile(p_profile_id uuid) to authenticated;
grant execute on function public.admin_reject_profile(p_profile_id uuid) to service_role;
grant execute on function public.admin_revoke_profile(p_profile_id uuid) to authenticated;
grant execute on function public.admin_revoke_profile(p_profile_id uuid) to service_role;
grant execute on function public.admin_revoke_profile_by_email(p_email text) to authenticated;
grant execute on function public.admin_revoke_profile_by_email(p_email text) to service_role;
grant execute on function public.admin_verify_profile_by_email(p_email text) to authenticated;
grant execute on function public.admin_verify_profile_by_email(p_email text) to service_role;
grant execute on function public.count_post_reports(p_post_id uuid) to anon;
grant execute on function public.count_post_reports(p_post_id uuid) to authenticated;
grant execute on function public.count_post_reports(p_post_id uuid) to service_role;
grant execute on function public.create_comment_safe(p_post_id uuid, p_body text) to authenticated;
grant execute on function public.create_comment_safe(p_post_id uuid, p_body text) to service_role;
grant execute on function public.create_follow_notification() to service_role;
grant execute on function public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) to anon;
grant execute on function public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) to authenticated;
grant execute on function public.create_visitor_report(p_post_id uuid, p_visitor_key text, p_reason text) to service_role;
grant execute on function public.delete_comment_safe(p_comment_id uuid) to authenticated;
grant execute on function public.delete_comment_safe(p_comment_id uuid) to service_role;
grant execute on function public.delete_own_post(p_post_id uuid) to authenticated;
grant execute on function public.delete_own_post(p_post_id uuid) to service_role;
grant execute on function public.delete_post(p_post_id uuid) to service_role;
grant execute on function public.find_verified_profile_by_email(p_email text) to authenticated;
grant execute on function public.find_verified_profile_by_email(p_email text) to service_role;
grant execute on function public.get_anonymous_post_label(p_post_id uuid) to anon;
grant execute on function public.get_anonymous_post_label(p_post_id uuid) to authenticated;
grant execute on function public.get_anonymous_post_label(p_post_id uuid) to service_role;
grant execute on function public.get_latest_public_post_marker() to anon;
grant execute on function public.get_latest_public_post_marker() to authenticated;
grant execute on function public.get_latest_public_post_marker() to service_role;
grant execute on function public.get_my_feed_viewer_state(p_post_ids uuid[]) to authenticated;
grant execute on function public.get_my_feed_viewer_state(p_post_ids uuid[]) to service_role;
grant execute on function public.get_profile_follow_summary(p_profile_id uuid) to authenticated;
grant execute on function public.get_profile_follow_summary(p_profile_id uuid) to service_role;
grant execute on function public.get_public_comments_for_post(target_post_id uuid, limit_count integer) to anon;
grant execute on function public.get_public_comments_for_post(target_post_id uuid, limit_count integer) to authenticated;
grant execute on function public.get_public_comments_for_post(target_post_id uuid, limit_count integer) to service_role;
grant execute on function public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer) to anon;
grant execute on function public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer) to authenticated;
grant execute on function public.get_public_comments_for_posts(target_post_ids uuid[], per_post_limit integer) to service_role;
grant execute on function public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) to anon;
grant execute on function public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) to authenticated;
grant execute on function public.get_public_posts(limit_count integer, cursor_created_at timestamp with time zone, cursor_id uuid) to service_role;
grant execute on function public.get_public_profile(p_user_id uuid) to anon;
grant execute on function public.get_public_profile(p_user_id uuid) to authenticated;
grant execute on function public.get_public_profile(p_user_id uuid) to service_role;
grant execute on function public.get_public_profiles_for_ids(p_user_ids uuid[]) to anon;
grant execute on function public.get_public_profiles_for_ids(p_user_ids uuid[]) to authenticated;
grant execute on function public.get_public_profiles_for_ids(p_user_ids uuid[]) to service_role;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
grant execute on function public.is_verified() to authenticated;
grant execute on function public.is_verified() to service_role;
grant execute on function public.is_verified_profile(p_profile_id uuid) to authenticated;
grant execute on function public.is_verified_profile(p_profile_id uuid) to service_role;
grant execute on function public.list_my_follow_connections(p_list_type text, p_limit integer, p_offset integer) to authenticated;
grant execute on function public.list_my_follow_connections(p_list_type text, p_limit integer, p_offset integer) to service_role;
grant execute on function public.list_my_notifications_hydrated(p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_notification_ids uuid[]) to authenticated;
grant execute on function public.list_my_notifications_hydrated(p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_notification_ids uuid[]) to service_role;
grant execute on function public.list_public_posts_by_author(p_profile_id uuid, p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid) to anon;
grant execute on function public.list_public_posts_by_author(p_profile_id uuid, p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid) to authenticated;
grant execute on function public.list_public_posts_by_author(p_profile_id uuid, p_limit integer, p_cursor_created_at timestamp with time zone, p_cursor_id uuid) to service_role;
grant execute on function public.protect_profile_sensitive_fields() to service_role;
grant execute on function public.recount_post_counters(p_post_id uuid) to service_role;
grant execute on function public.request_profile_rereview(p_phone text) to anon;
grant execute on function public.request_profile_rereview(p_phone text) to authenticated;
grant execute on function public.request_profile_rereview(p_phone text) to service_role;
grant execute on function public.restore_reported_post(p_post_id uuid) to authenticated;
grant execute on function public.restore_reported_post(p_post_id uuid) to service_role;
grant execute on function public.search_verified_profile_by_email(p_email text) to authenticated;
grant execute on function public.search_verified_profile_by_email(p_email text) to service_role;
grant execute on function public.tg_cache_author_fields() to service_role;
grant execute on function public.tg_cache_comment_author() to service_role;
grant execute on function public.tg_mark_post_reported() to service_role;
grant execute on function public.tg_notify_on_comment() to service_role;
grant execute on function public.tg_notify_on_upvote() to service_role;
grant execute on function public.tg_recount_comment_counters() to service_role;
grant execute on function public.tg_recount_report_counters() to service_role;
grant execute on function public.tg_recount_upvote_counters() to service_role;
grant execute on function public.tg_set_updated_at() to service_role;
grant execute on function public.toggle_post_report(p_post_id uuid, p_reason text) to authenticated;
grant execute on function public.toggle_post_report(p_post_id uuid, p_reason text) to service_role;

-- REALTIME PUBLICATION TABLES
-- No public realtime publication tables found in live database.

-- SEED: PUBLIC RESOURCES
insert into public.resources
select *
from jsonb_populate_record(null::public.resources, '{"id": "b2ff6945-d61b-4be4-8cf1-90e4d8c484ee", "link": "https://www.fortblissfamilyhomes.com/", "title": "Fort Bliss Housing", "section": "On-Post", "created_at": "2026-05-03T19:00:08.584246+00:00", "updated_at": "2026-05-03T19:00:08.584246+00:00", "description": "On post housing", "display_order": 0}'::jsonb)
on conflict (id) do nothing;
set check_function_bodies = on;

commit;

-- ============================================================================

set check_function_bodies = on;

commit;

-- After running this file in a NEW Supabase project:
-- 1. Configure Supabase Auth redirect URLs.
-- 2. Configure Resend SMTP in Supabase Auth.
-- 3. Add Vercel environment variables.
-- 4. Configure Upstash/KV, Cloudflare R2, and Sentry.
-- 5. Create your first user, then make that user admin/verified.
-- ============================================================================
