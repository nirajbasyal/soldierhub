-- Make follow notifications atomic, idempotent, and reproducible from migrations.
-- The production database already had an uncommitted version of this trigger;
-- this migration brings source control back in sync and removes duplicate rows.

begin;

with ranked_follow_notifications as (
  select
    id,
    row_number() over (
      partition by recipient_user_id, actor_user_id, type
      order by created_at desc, id desc
    ) as duplicate_rank
  from public.notifications
  where type = 'follow'
)
delete from public.notifications n
using ranked_follow_notifications ranked
where n.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists notifications_unique_follow_actor_idx
  on public.notifications (recipient_user_id, actor_user_id, type)
  where type = 'follow';

create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_name text;
begin
  if new.follower_id is null
     or new.following_id is null
     or new.follower_id = new.following_id then
    return new;
  end if;

  select coalesce(p.full_name, 'Someone')
  into v_actor_name
  from public.profiles p
  where p.id = new.follower_id;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    actor_name_cached,
    type,
    post_title_cached,
    read,
    created_at
  )
  values (
    new.following_id,
    new.follower_id,
    coalesce(v_actor_name, 'Someone'),
    'follow',
    'followed your profile',
    false,
    now()
  )
  on conflict (recipient_user_id, actor_user_id, type)
    where type = 'follow'
  do update set
    read = false,
    actor_name_cached = excluded.actor_name_cached,
    post_title_cached = excluded.post_title_cached,
    created_at = excluded.created_at;

  return new;
end;
$$;

revoke all on function public.create_follow_notification() from public, anon, authenticated;
grant execute on function public.create_follow_notification() to service_role;

drop trigger if exists profile_follows_create_notification_trigger
  on public.profile_follows;

create trigger profile_follows_create_notification_trigger
after insert on public.profile_follows
for each row
execute function public.create_follow_notification();

comment on function public.create_follow_notification() is
  'Internal trigger only. Creates or refreshes one follow notification per actor and recipient.';

commit;
