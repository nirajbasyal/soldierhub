-- Soldier Hub production database cleanup
-- Purpose:
-- 1. Add two missing foreign-key helper indexes.
-- 2. Remove exact duplicate indexes that add write overhead.
-- 3. Tighten RPC execute permissions for functions that should require login.
--
-- This migration is intentionally conservative.
-- It does not change table data, RLS policies, views, or function bodies.
--
-- Because current production table sizes are very small, normal CREATE/DROP INDEX
-- is acceptable here and avoids transaction issues with CREATE INDEX CONCURRENTLY.

-- -----------------------------------------------------------------------------
-- 1. Add missing foreign-key helper indexes
-- -----------------------------------------------------------------------------

create index if not exists comments_deleted_by_idx
  on public.comments (deleted_by)
  where deleted_by is not null;

create index if not exists notifications_actor_user_id_idx
  on public.notifications (actor_user_id)
  where actor_user_id is not null;

-- -----------------------------------------------------------------------------
-- 2. Drop exact duplicate indexes
-- -----------------------------------------------------------------------------
-- Keep: comments_post_active_created_idx
-- Drop: comments_active_post_created_idx
-- Reason: exact same columns and predicate: (post_id, created_at) WHERE deleted_at IS NULL

drop index if exists public.comments_active_post_created_idx;

-- Keep: profile_follows_follower_created_idx
-- Drop: profile_follows_follower_idx
-- Reason: exact same columns: (follower_id, created_at DESC)

drop index if exists public.profile_follows_follower_idx;

-- Keep: profile_follows_following_created_idx
-- Drop: profile_follows_following_idx
-- Reason: exact same columns: (following_id, created_at DESC)

drop index if exists public.profile_follows_following_idx;

-- -----------------------------------------------------------------------------
-- 3. Tighten RPC permissions
-- -----------------------------------------------------------------------------
-- create_comment_safe internally blocks anonymous users, but anon should not be
-- able to execute it at all. Authenticated users still need it for replies.

revoke execute on function public.create_comment_safe(uuid, text) from public;
grant execute on function public.create_comment_safe(uuid, text) to authenticated;

-- list_my_follow_connections requires auth.uid() and verified status internally,
-- so anon execution is unnecessary. Authenticated users still need it.

revoke execute on function public.list_my_follow_connections(text, integer, integer) from public;
grant execute on function public.list_my_follow_connections(text, integer, integer) to authenticated;
