-- Force user-authored post and comment content through the server routes that
-- apply rate limits, validation, media ownership checks, and moderation.
--
-- service_role retains its existing privileges and is used only from the
-- server runtime after the caller's JWT, profile, ownership, and content have
-- been validated.

begin;

-- Direct PostgREST writes from browser-held anon/authenticated credentials
-- must fail even when a row would otherwise satisfy RLS.
revoke insert on table public.posts from anon, authenticated;
revoke update on table public.posts from anon, authenticated;
revoke update (
  body,
  category,
  edited,
  moderation_status,
  moderation_reason,
  moderation_checked_at
) on table public.posts from authenticated;

revoke insert on table public.comments from anon, authenticated;
revoke update on table public.comments from anon, authenticated;

-- Remove obsolete policies as defense in depth. This prevents a future table
-- grant from silently reopening the bypass without an explicit policy review.
drop policy if exists "posts: verified users can create posts" on public.posts;
drop policy if exists "posts: authenticated update allowed" on public.posts;
drop policy if exists "comments: verified users can create" on public.comments;

-- This legacy RPC validates identity and length, but it cannot enforce the
-- application rate limit or moderation provider. Keep it available only to
-- trusted server credentials for rollback compatibility.
revoke execute on function public.create_comment_safe(uuid, text)
from public, anon, authenticated;
grant execute on function public.create_comment_safe(uuid, text) to service_role;

comment on function public.create_comment_safe(uuid, text) is
  'Server-only legacy comment writer. Public app writes must use /api/comments/create for moderation and rate limiting.';

comment on table public.posts is
  'User content writes are server-only. anon/authenticated retain approved read/delete access but cannot insert or update post content directly.';

comment on table public.comments is
  'User content creation is server-only. anon/authenticated cannot insert comments or call the legacy writer directly.';

commit;
