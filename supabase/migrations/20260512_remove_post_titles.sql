-- Remove post titles from SoldierHub posts.
-- Run this in Supabase SQL Editor after deploying the app code.

begin;

-- Recreate public post views without title.
create or replace view public.posts_with_meta
with (security_invoker = true) as
select
  p.id,
  case when p.anonymous then null else p.author_id end as author_id,
  p.category,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  case when p.anonymous then null else p.author_name_cached end  as author_name,
  case when p.anonymous then null else p.author_color_cached end as author_color,
  coalesce((select count(*) from public.upvotes  u where u.post_id = p.id), 0) as upvote_count,
  coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
  (
    coalesce((select count(*) from public.reports r where r.post_id = p.id), 0)
    +
    coalesce((select count(*) from public.visitor_reports vr where vr.post_id = p.id), 0)
  ) as report_count
from public.posts p
where p.status in ('active', 'reported');

create or replace view public.my_posts_with_meta
with (security_invoker = true) as
select
  p.id,
  p.author_id,
  p.category,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  p.author_name_cached  as author_name,
  p.author_color_cached as author_color,
  coalesce((select count(*) from public.upvotes  u where u.post_id = p.id), 0) as upvote_count,
  coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
  (
    coalesce((select count(*) from public.reports r where r.post_id = p.id), 0)
    +
    coalesce((select count(*) from public.visitor_reports vr where vr.post_id = p.id), 0)
  ) as report_count
from public.posts p;

-- Recreate public feed RPC without title.
create or replace function public.get_public_posts(
  limit_count int default 50,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  category text,
  body text,
  anonymous boolean,
  status text,
  edited boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_color text,
  upvote_count bigint,
  comment_count bigint,
  report_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    case when p.anonymous then null else p.author_id end as author_id,
    p.category,
    p.body,
    p.anonymous,
    p.status,
    p.edited,
    p.created_at,
    p.updated_at,
    case when p.anonymous then null else p.author_name_cached end as author_name,
    case when p.anonymous then null else p.author_color_cached end as author_color,
    coalesce((select count(*) from public.upvotes u where u.post_id = p.id), 0) as upvote_count,
    coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
    (
      coalesce((select count(*) from public.reports r where r.post_id = p.id), 0)
      +
      coalesce((select count(*) from public.visitor_reports vr where vr.post_id = p.id), 0)
    ) as report_count
  from public.posts p
  where p.status in ('active', 'reported')
    and (
      cursor_created_at is null
      or cursor_id is null
      or (p.created_at, p.id) < (cursor_created_at, cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit greatest(1, least(limit_count, 50));
$$;

-- Notifications no longer cache post titles.
drop trigger if exists comment_creates_notification on public.comments;

drop function if exists public.tg_notify_on_comment();

create or replace function public.tg_notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  actor_name_local text;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is null or post_author = new.author_id then
    return new;
  end if;

  select full_name into actor_name_local
  from public.profiles
  where id = new.author_id;

  insert into public.notifications
    (recipient_user_id, actor_user_id, actor_name_cached, type, post_id, comment_id)
  values
    (post_author, new.author_id, actor_name_local, 'comment', new.post_id, new.id);

  return new;
end $$;

create trigger comment_creates_notification
  after insert on public.comments
  for each row execute procedure public.tg_notify_on_comment();

-- Remove column-level title update grant before dropping the title column.
revoke update on public.posts from authenticated;
grant update (body, category, edited) on public.posts to authenticated;

alter table public.notifications
  drop column if exists post_title_cached;

alter table public.posts
  drop column if exists title;

grant select on public.posts_with_meta to anon, authenticated;
grant select on public.my_posts_with_meta to authenticated;
grant execute on function public.get_public_posts(int, timestamptz, uuid) to anon, authenticated;

commit;
