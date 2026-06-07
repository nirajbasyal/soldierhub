-- Track moderation health for post create/update paths so degraded safety checks
-- are auditable and can be re-scanned after provider outages.

begin;

alter table public.posts
  add column if not exists moderation_status text not null default 'unreviewed',
  add column if not exists moderation_reason text,
  add column if not exists moderation_checked_at timestamptz;

alter table public.posts
  drop constraint if exists posts_moderation_status_check,
  add constraint posts_moderation_status_check
    check (moderation_status in ('unreviewed', 'approved', 'degraded'));

-- Prior migrations narrowed author update grants to editable fields. The server
-- update route now also records moderation audit state after body edits.
grant update (body, category, edited, moderation_status, moderation_reason, moderation_checked_at)
  on public.posts to authenticated;

commit;
