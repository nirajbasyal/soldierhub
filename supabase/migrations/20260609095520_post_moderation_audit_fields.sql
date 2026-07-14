begin;

alter table public.posts
  add column if not exists moderation_status text not null default 'unreviewed',
  add column if not exists moderation_reason text,
  add column if not exists moderation_checked_at timestamptz;

alter table public.posts
  drop constraint if exists posts_moderation_status_check,
  add constraint posts_moderation_status_check
    check (moderation_status in ('unreviewed', 'approved', 'degraded'));

grant update (body, category, edited, moderation_status, moderation_reason, moderation_checked_at)
  on public.posts to authenticated;

commit;
