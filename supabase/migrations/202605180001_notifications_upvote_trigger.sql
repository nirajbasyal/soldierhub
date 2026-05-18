-- SoldierHub notification hardening: create upvote notifications from the database layer.
-- Safe to run more than once.

begin;

create or replace function public.tg_notify_on_upvote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post record;
  actor_profile record;
begin
  select p.id, p.author_id, p.body
    into target_post
  from public.posts p
  where p.id = new.post_id
  limit 1;

  if target_post.author_id is null then
    return new;
  end if;

  -- Do not notify users for their own upvotes.
  if target_post.author_id = new.user_id then
    return new;
  end if;

  select pr.full_name, pr.avatar_color
    into actor_profile
  from public.profiles pr
  where pr.id = new.user_id
  limit 1;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    actor_name_cached,
    type,
    post_id,
    post_title_cached,
    read
  )
  values (
    target_post.author_id,
    new.user_id,
    coalesce(actor_profile.full_name, 'Someone'),
    'upvote',
    new.post_id,
    left(coalesce(target_post.body, 'your post'), 180),
    false
  )
  on conflict do nothing;

  return new;
end;
$$;

create unique index if not exists notifications_unique_upvote_actor_post_idx
on public.notifications (recipient_user_id, actor_user_id, post_id, type)
where type = 'upvote'
  and actor_user_id is not null
  and post_id is not null;

drop trigger if exists upvote_creates_notification on public.upvotes;

create trigger upvote_creates_notification
after insert on public.upvotes
for each row
execute function public.tg_notify_on_upvote();

revoke all on function public.tg_notify_on_upvote() from public;

commit;
