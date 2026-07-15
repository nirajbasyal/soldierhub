# Supabase RPC Permission Allowlist

`supabase/migrations/` is the production source of truth. This file explains the intentional RPC/function access model for Soldier Hub.

## Rule

Every `SECURITY DEFINER` function in the public schema must have an intentional execute role:

- `anon`: only public-safe read/report endpoints.
- `authenticated`: signed-in app endpoints. Function body must enforce ownership, verification, or admin rules.
- `service_role`: backend/internal and trigger/maintenance functions.

Do not rely on default `PUBLIC` execute access.

## Public-safe RPCs

These may be callable by `anon` and `authenticated` because they power public feed/profile/comment/search pages or anonymous visitor reporting:

- `count_post_reports(uuid)`
- `create_visitor_report(uuid, text, text)`
- `get_latest_public_post_marker()`
- `get_public_comments_for_post(uuid, integer)`
- `get_public_comments_for_posts(uuid[], integer)`
- `get_public_post(uuid)`
- `get_public_posts(integer, timestamptz, uuid)`
- `get_public_profile(uuid)`
- `get_public_profiles_for_ids(uuid[])`
- `list_public_posts_by_author(uuid, integer, timestamptz, uuid)`
- `request_profile_rereview(text)`
- `search_public_posts(text, integer, integer)`
- `search_public_posts_keyset(text, integer, integer, timestamptz, uuid)`

## Signed-in RPCs

These require `authenticated`. The function body or API route must enforce owner/admin/verification checks:

- `delete_comment_safe(uuid)`
- `delete_own_post(uuid)`
- `find_verified_profile_by_email(text)`
- `get_my_feed_viewer_state(uuid[])`
- `get_profile_follow_summary(uuid)`
- `is_admin()`
- `is_verified()`
- `is_verified_profile(uuid)`
- `list_my_follow_connections(text, integer, integer)`
- `list_my_notifications_hydrated(integer, timestamptz, uuid, uuid[])`
- `search_verified_profile_by_email(text)`
- `search_verified_profiles(text, integer, integer)`
- `search_verified_profiles_by_name(text, integer, integer)`
- `toggle_post_report(uuid, text)`

## Internal-only RPCs / trigger functions

These should not be directly executable by `anon` or `authenticated`. They are for triggers, auth signup, maintenance, or service-role-only flows:

- `create_follow_notification()`
- `admin_list_profiles(text, integer)`
- `admin_reject_profile(uuid)`
- `admin_revoke_profile(uuid)`
- `admin_revoke_profile_by_email(text)`
- `admin_verify_profile_by_email(text)`
- `create_comment_safe(uuid, text)`
- `delete_post(uuid)`
- `handle_new_user()`
- `protect_profile_sensitive_fields()`
- `recount_post_counters(uuid)`
- `restore_reported_post(uuid)`
- `tg_cache_author_fields()`
- `tg_cache_comment_author()`
- `tg_mark_post_reported()`
- `tg_notify_on_comment()`
- `tg_notify_on_upvote()`
- `tg_recount_comment_counters()`
- `tg_recount_report_counters()`
- `tg_recount_upvote_counters()`

## Current hardening migration

The current permission allowlist migration is:

`supabase/migrations/20260715154252_enforce_admin_mfa_boundaries.sql`

It revokes broad execute access and grants each exposed RPC intentionally.

## Important Supabase advisor note

Supabase may still warn when a `SECURITY DEFINER` function is intentionally executable by `anon` or `authenticated`. That does not automatically mean the app is broken. It means the function is powerful and should be reviewed. This allowlist is the review record.

`public.is_admin()` deliberately remains executable by `authenticated` because
RLS policies call it. It returns true only for `service_role`; browser JWTs are
never database administrators, even after MFA. Protected admin routes verify
the configured email allowlist and AAL2 before obtaining their server-only
client. Admin profile and post-moderation RPCs are not browser-callable.

Before changing any grant, search the app code for `.rpc("function_name")` and confirm the feature still works after the change.
