begin;

-- Harden RPC/function permissions with an explicit allowlist.
-- This migration does not change function bodies. It removes inherited PUBLIC
-- execute access and grants each SECURITY DEFINER function only to the roles
-- that intentionally need it.

-- --------------------------------------------------------------------------
-- Public read/report RPCs: intentionally callable by anon and authenticated.
-- These power public feed/profile/comment/search pages and anonymous visitor
-- reporting. They still validate and return only public-safe data.
-- --------------------------------------------------------------------------
revoke all on function public.count_post_reports(uuid) from public, anon, authenticated;
grant execute on function public.count_post_reports(uuid) to anon, authenticated, service_role;
comment on function public.count_post_reports(uuid) is 'RPC allowlist: anon/authenticated/service_role. Public-safe report count helper.';

revoke all on function public.create_visitor_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_visitor_report(uuid, text, text) to anon, authenticated, service_role;
comment on function public.create_visitor_report(uuid, text, text) is 'RPC allowlist: anon/authenticated/service_role. Allows anonymous visitor reports with function-side validation.';

revoke all on function public.get_latest_public_post_marker() from public, anon, authenticated;
grant execute on function public.get_latest_public_post_marker() to anon, authenticated, service_role;
comment on function public.get_latest_public_post_marker() is 'RPC allowlist: anon/authenticated/service_role. Public feed freshness marker.';

revoke all on function public.get_public_comments_for_post(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_public_comments_for_post(uuid, integer) to anon, authenticated, service_role;
comment on function public.get_public_comments_for_post(uuid, integer) is 'RPC allowlist: anon/authenticated/service_role. Public-safe comments for visible posts.';

revoke all on function public.get_public_comments_for_posts(uuid[], integer) from public, anon, authenticated;
grant execute on function public.get_public_comments_for_posts(uuid[], integer) to anon, authenticated, service_role;
comment on function public.get_public_comments_for_posts(uuid[], integer) is 'RPC allowlist: anon/authenticated/service_role. Batched public-safe comments for visible posts.';

revoke all on function public.get_public_post(uuid) from public, anon, authenticated;
grant execute on function public.get_public_post(uuid) to anon, authenticated, service_role;
comment on function public.get_public_post(uuid) is 'RPC allowlist: anon/authenticated/service_role. Public-safe single post reader.';

revoke all on function public.get_public_posts(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.get_public_posts(integer, timestamptz, uuid) to anon, authenticated, service_role;
comment on function public.get_public_posts(integer, timestamptz, uuid) is 'RPC allowlist: anon/authenticated/service_role. Public feed reader.';

revoke all on function public.get_public_profile(uuid) from public, anon, authenticated;
grant execute on function public.get_public_profile(uuid) to anon, authenticated, service_role;
comment on function public.get_public_profile(uuid) is 'RPC allowlist: anon/authenticated/service_role. Public-safe profile reader.';

revoke all on function public.get_public_profiles_for_ids(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_profiles_for_ids(uuid[]) to anon, authenticated, service_role;
comment on function public.get_public_profiles_for_ids(uuid[]) is 'RPC allowlist: anon/authenticated/service_role. Public-safe batched profile reader.';

revoke all on function public.list_public_posts_by_author(uuid, integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.list_public_posts_by_author(uuid, integer, timestamptz, uuid) to anon, authenticated, service_role;
comment on function public.list_public_posts_by_author(uuid, integer, timestamptz, uuid) is 'RPC allowlist: anon/authenticated/service_role. Public-safe author post listing.';

revoke all on function public.request_profile_rereview(text) from public, anon, authenticated;
grant execute on function public.request_profile_rereview(text) to anon, authenticated, service_role;
comment on function public.request_profile_rereview(text) is 'RPC allowlist: anon/authenticated/service_role. Public re-review request endpoint; function validates allowed updates.';

revoke all on function public.search_public_posts(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_public_posts(text, integer, integer) to anon, authenticated, service_role;
comment on function public.search_public_posts(text, integer, integer) is 'RPC allowlist: anon/authenticated/service_role. Public-safe post search fallback.';

revoke all on function public.search_public_posts_keyset(text, integer, integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.search_public_posts_keyset(text, integer, integer, timestamptz, uuid) to anon, authenticated, service_role;
comment on function public.search_public_posts_keyset(text, integer, integer, timestamptz, uuid) is 'RPC allowlist: anon/authenticated/service_role. Public-safe keyset post search.';

-- --------------------------------------------------------------------------
-- Authenticated app RPCs: signed-in users only.
-- Functions include their own ownership/admin/verification checks.
-- --------------------------------------------------------------------------
revoke all on function public.admin_list_profiles(text, integer) from public, anon, authenticated;
grant execute on function public.admin_list_profiles(text, integer) to authenticated, service_role;
comment on function public.admin_list_profiles(text, integer) is 'RPC allowlist: authenticated/service_role only. Function enforces admin role before returning queues.';

revoke all on function public.admin_reject_profile(uuid) from public, anon, authenticated;
grant execute on function public.admin_reject_profile(uuid) to authenticated, service_role;
comment on function public.admin_reject_profile(uuid) is 'RPC allowlist: authenticated/service_role only. Function enforces admin role before rejecting profile.';

revoke all on function public.admin_revoke_profile(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_profile(uuid) to authenticated, service_role;
comment on function public.admin_revoke_profile(uuid) is 'RPC allowlist: authenticated/service_role only. Function enforces admin role before revoking profile.';

revoke all on function public.admin_revoke_profile_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_revoke_profile_by_email(text) to authenticated, service_role;
comment on function public.admin_revoke_profile_by_email(text) is 'RPC allowlist: authenticated/service_role only. Function enforces admin role before revoking by email.';

revoke all on function public.admin_verify_profile_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_verify_profile_by_email(text) to authenticated, service_role;
comment on function public.admin_verify_profile_by_email(text) is 'RPC allowlist: authenticated/service_role only. Function enforces admin role before verifying by email.';

revoke all on function public.create_comment_safe(uuid, text) from public, anon, authenticated;
grant execute on function public.create_comment_safe(uuid, text) to authenticated, service_role;
comment on function public.create_comment_safe(uuid, text) is 'RPC allowlist: authenticated/service_role only. Creates comments after verification/visibility checks.';

revoke all on function public.delete_comment_safe(uuid) from public, anon, authenticated;
grant execute on function public.delete_comment_safe(uuid) to authenticated, service_role;
comment on function public.delete_comment_safe(uuid) is 'RPC allowlist: authenticated/service_role only. Deletes comments after owner/admin checks.';

revoke all on function public.delete_own_post(uuid) from public, anon, authenticated;
grant execute on function public.delete_own_post(uuid) to authenticated, service_role;
comment on function public.delete_own_post(uuid) is 'RPC allowlist: authenticated/service_role only. Deletes own post after ownership checks.';

revoke all on function public.find_verified_profile_by_email(text) from public, anon, authenticated;
grant execute on function public.find_verified_profile_by_email(text) to authenticated, service_role;
comment on function public.find_verified_profile_by_email(text) is 'RPC allowlist: authenticated/service_role only. Email profile lookup for signed-in flows.';

revoke all on function public.get_my_feed_viewer_state(uuid[]) from public, anon, authenticated;
grant execute on function public.get_my_feed_viewer_state(uuid[]) to authenticated, service_role;
comment on function public.get_my_feed_viewer_state(uuid[]) is 'RPC allowlist: authenticated/service_role only. Returns current viewer state for posts.';

revoke all on function public.get_profile_follow_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_profile_follow_summary(uuid) to authenticated, service_role;
comment on function public.get_profile_follow_summary(uuid) is 'RPC allowlist: authenticated/service_role only. Follow summary for signed-in member UX.';

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;
comment on function public.is_admin() is 'RPC allowlist: authenticated/service_role only. Helper used by policies/functions.';

revoke all on function public.is_verified() from public, anon, authenticated;
grant execute on function public.is_verified() to authenticated, service_role;
comment on function public.is_verified() is 'RPC allowlist: authenticated/service_role only. Helper used by policies/functions.';

revoke all on function public.is_verified_profile(uuid) from public, anon, authenticated;
grant execute on function public.is_verified_profile(uuid) to authenticated, service_role;
comment on function public.is_verified_profile(uuid) is 'RPC allowlist: authenticated/service_role only. Helper used by policies/functions.';

revoke all on function public.list_my_follow_connections(text, integer, integer) from public, anon, authenticated;
grant execute on function public.list_my_follow_connections(text, integer, integer) to authenticated, service_role;
comment on function public.list_my_follow_connections(text, integer, integer) is 'RPC allowlist: authenticated/service_role only. Returns current user follow connections.';

revoke all on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) to authenticated, service_role;
comment on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) is 'RPC allowlist: authenticated/service_role only. Returns current user hydrated notifications.';

revoke all on function public.restore_reported_post(uuid) from public, anon, authenticated;
grant execute on function public.restore_reported_post(uuid) to authenticated, service_role;
comment on function public.restore_reported_post(uuid) is 'RPC allowlist: authenticated/service_role only. Function enforces admin/moderation rules before restore.';

revoke all on function public.search_verified_profile_by_email(text) from public, anon, authenticated;
grant execute on function public.search_verified_profile_by_email(text) to authenticated, service_role;
comment on function public.search_verified_profile_by_email(text) is 'RPC allowlist: authenticated/service_role only. Member email search for signed-in verified flow.';

revoke all on function public.search_verified_profiles(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_verified_profiles(text, integer, integer) to authenticated, service_role;
comment on function public.search_verified_profiles(text, integer, integer) is 'RPC allowlist: authenticated/service_role only. Member search for signed-in flow.';

revoke all on function public.search_verified_profiles_by_name(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_verified_profiles_by_name(text, integer, integer) to authenticated, service_role;
comment on function public.search_verified_profiles_by_name(text, integer, integer) is 'RPC allowlist: authenticated/service_role only. Member name search for signed-in flow.';

revoke all on function public.toggle_post_report(uuid, text) from public, anon, authenticated;
grant execute on function public.toggle_post_report(uuid, text) to authenticated, service_role;
comment on function public.toggle_post_report(uuid, text) is 'RPC allowlist: authenticated/service_role only. Signed-in post report toggle.';

-- --------------------------------------------------------------------------
-- Internal-only SECURITY DEFINER functions: no API role execution.
-- Triggers can still execute trigger functions; they do not need client EXECUTE.
-- --------------------------------------------------------------------------
revoke all on function public.create_follow_notification() from public, anon, authenticated;
grant execute on function public.create_follow_notification() to service_role;
comment on function public.create_follow_notification() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.delete_post(uuid) from public, anon, authenticated;
grant execute on function public.delete_post(uuid) to service_role;
comment on function public.delete_post(uuid) is 'RPC allowlist: service_role only. Prefer API routes/RPCs with explicit owner/admin checks.';

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
comment on function public.handle_new_user() is 'RPC allowlist: auth trigger/service_role only.';

revoke all on function public.protect_profile_sensitive_fields() from public, anon, authenticated;
grant execute on function public.protect_profile_sensitive_fields() to service_role;
comment on function public.protect_profile_sensitive_fields() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.recount_post_counters(uuid) from public, anon, authenticated;
grant execute on function public.recount_post_counters(uuid) to service_role;
comment on function public.recount_post_counters(uuid) is 'RPC allowlist: internal maintenance/service_role only.';

revoke all on function public.tg_cache_author_fields() from public, anon, authenticated;
grant execute on function public.tg_cache_author_fields() to service_role;
comment on function public.tg_cache_author_fields() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_cache_comment_author() from public, anon, authenticated;
grant execute on function public.tg_cache_comment_author() to service_role;
comment on function public.tg_cache_comment_author() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_mark_post_reported() from public, anon, authenticated;
grant execute on function public.tg_mark_post_reported() to service_role;
comment on function public.tg_mark_post_reported() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_notify_on_comment() from public, anon, authenticated;
grant execute on function public.tg_notify_on_comment() to service_role;
comment on function public.tg_notify_on_comment() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_notify_on_upvote() from public, anon, authenticated;
grant execute on function public.tg_notify_on_upvote() to service_role;
comment on function public.tg_notify_on_upvote() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_recount_comment_counters() from public, anon, authenticated;
grant execute on function public.tg_recount_comment_counters() to service_role;
comment on function public.tg_recount_comment_counters() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_recount_report_counters() from public, anon, authenticated;
grant execute on function public.tg_recount_report_counters() to service_role;
comment on function public.tg_recount_report_counters() is 'RPC allowlist: internal trigger/service_role only.';

revoke all on function public.tg_recount_upvote_counters() from public, anon, authenticated;
grant execute on function public.tg_recount_upvote_counters() to service_role;
comment on function public.tg_recount_upvote_counters() is 'RPC allowlist: internal trigger/service_role only.';

commit;
