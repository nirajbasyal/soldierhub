-- Harden RPC/function EXECUTE permissions with an explicit allowlist.
-- Run after all app RPC functions exist.
-- Purpose: remove inherited PUBLIC execution and make every exposed RPC intentional.

begin;

-- Default hardening: no function should be executable just because it exists.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- Public-safe read/report RPCs used by anonymous visitors and signed-in members.
grant execute on function public.count_post_reports(uuid) to anon, authenticated;
grant execute on function public.create_visitor_report(uuid, text, text) to anon, authenticated;
grant execute on function public.get_latest_public_post_marker() to anon, authenticated;
grant execute on function public.get_public_comments_for_post(uuid, integer) to anon, authenticated;
grant execute on function public.get_public_comments_for_posts(uuid[], integer) to anon, authenticated;
grant execute on function public.get_public_post(uuid) to anon, authenticated;
grant execute on function public.get_public_posts(integer, timestamptz, uuid) to anon, authenticated;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;
grant execute on function public.get_public_profiles_for_ids(uuid[]) to anon, authenticated;
grant execute on function public.list_public_posts_by_author(uuid, integer, timestamptz, uuid) to anon, authenticated;
grant execute on function public.request_profile_rereview(text) to anon, authenticated;
grant execute on function public.search_public_posts(text, integer, integer) to anon, authenticated;
grant execute on function public.search_public_posts_keyset(text, integer, integer, timestamptz, uuid) to anon, authenticated;

-- Signed-in app RPCs. Function bodies enforce owner/admin/verification checks.
grant execute on function public.admin_list_profiles(text, integer) to authenticated;
grant execute on function public.admin_reject_profile(uuid) to authenticated;
grant execute on function public.admin_revoke_profile(uuid) to authenticated;
grant execute on function public.admin_revoke_profile_by_email(text) to authenticated;
grant execute on function public.admin_verify_profile_by_email(text) to authenticated;
grant execute on function public.create_comment_safe(uuid, text) to authenticated;
grant execute on function public.delete_comment_safe(uuid) to authenticated;
grant execute on function public.delete_own_post(uuid) to authenticated;
grant execute on function public.find_verified_profile_by_email(text) to authenticated;
grant execute on function public.get_my_feed_viewer_state(uuid[]) to authenticated;
grant execute on function public.get_profile_follow_summary(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_verified() to authenticated;
grant execute on function public.is_verified_profile(uuid) to authenticated;
grant execute on function public.list_my_follow_connections(text, integer, integer) to authenticated;
grant execute on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) to authenticated;
grant execute on function public.restore_reported_post(uuid) to authenticated;
grant execute on function public.search_verified_profile_by_email(text) to authenticated;
grant execute on function public.search_verified_profiles(text, integer, integer) to authenticated;
grant execute on function public.search_verified_profiles_by_name(text, integer, integer) to authenticated;
grant execute on function public.toggle_post_report(uuid, text) to authenticated;

-- Document key access decisions in database metadata.
comment on function public.get_public_posts(integer, timestamptz, uuid) is 'RPC allowlist: anon/authenticated. Public-safe feed reader.';
comment on function public.get_public_post(uuid) is 'RPC allowlist: anon/authenticated. Public-safe post reader.';
comment on function public.get_public_profile(uuid) is 'RPC allowlist: anon/authenticated. Public-safe profile reader.';
comment on function public.create_comment_safe(uuid, text) is 'RPC allowlist: authenticated only. Function validates verification and visibility.';
comment on function public.list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[]) is 'RPC allowlist: authenticated only. Returns notifications for current user.';
comment on function public.admin_list_profiles(text, integer) is 'RPC allowlist: authenticated only. Function enforces admin role.';
comment on function public.admin_reject_profile(uuid) is 'RPC allowlist: authenticated only. Function enforces admin role.';
comment on function public.admin_revoke_profile(uuid) is 'RPC allowlist: authenticated only. Function enforces admin role.';
comment on function public.admin_verify_profile_by_email(text) is 'RPC allowlist: authenticated only. Function enforces admin role.';
comment on function public.admin_revoke_profile_by_email(text) is 'RPC allowlist: authenticated only. Function enforces admin role.';

commit;
