-- Database-backed post counters for faster feed/profile loading.
-- This migration is intentionally conservative:
-- 1) add nullable-safe counter columns with defaults
-- 2) backfill from current tables
-- 3) add exact-recount trigger helpers so counts stay accurate
-- 4) update feed RPC/views to read stored counters instead of counting per feed load

begin;

alter table public.posts
  add column if not exists upvote_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists report_count integer not null default 0;

-- Keep counter values sane even if a future manual update makes a mistake.
alter table public.posts
  drop constraint if exists posts_upvote_count_nonnegative,
  drop constraint if exists posts_comment_count_nonnegative,
  drop constraint if exists posts_report_count_nonnegative;

alter table public.posts
  add constraint posts_upvote_count_nonnegative check (upvote_count >= 0),
  add constraint posts_comment_count_nonnegative check (comment_count >= 0),
  add constraint posts_report_count_nonnegative check (report_count >= 0);

-- Backfill existing rows using the same logic your feed/views were already using.
update public.posts p
set
  upvote_count = coalesce(u.count_value, 0)::integer,
  comment_count = coalesce(c.count_value, 0)::integer,
  report_count = (coalesce(r.count_value, 0) + coalesce(vr.count_value, 0))::integer
from public.posts base
left join (
  select post_id, count(*) as count_value
  from public.upvotes
  group by post_id
) u on u.post_id = base.id
left join (
  select post_id, count(*) as count_value
  from public.comments
  where deleted_at is null
  group by post_id
) c on c.post_id = base.id
left join (
  select post_id, count(*) as count_value
  from public.reports
  group by post_id
) r on r.post_id = base.id
left join (
  select post_id, count(*) as count_value
  from public.visitor_reports
  group by post_id
) vr on vr.post_id = base.id
where p.id = base.id;

create or replace function public.recount_post_counters(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_post_id is null then
    return;
  end if;

  update public.posts p
  set
    upvote_count = coalesce((
      select count(*)::integer
      from public.upvotes u
      where u.post_id = p_post_id
    ), 0),
    comment_count = coalesce((
      select count(*)::integer
      from public.comments c
      where c.post_id = p_post_id
        and c.deleted_at is null
    ), 0),
    report_count = (
      coalesce((
        select count(*)::integer
        from public.reports r
        where r.post_id = p_post_id
      ), 0)
      +
      coalesce((
        select count(*)::integer
        from public.visitor_reports vr
        where vr.post_id = p_post_id
      ), 0)
    )
  where p.id = p_post_id;
end;
$$;

revoke all on function public.recount_post_counters(uuid) from public, anon, authenticated;

create or replace function public.tg_recount_upvote_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recount_post_counters(new.post_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.recount_post_counters(old.post_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.post_id is distinct from new.post_id then
      perform public.recount_post_counters(old.post_id);
      perform public.recount_post_counters(new.post_id);
    else
      perform public.recount_post_counters(new.post_id);
    end if;
    return new;
  end if;

  return null;
end;
$$;

create or replace function public.tg_recount_comment_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recount_post_counters(new.post_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.recount_post_counters(old.post_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.post_id is distinct from new.post_id then
      perform public.recount_post_counters(old.post_id);
      perform public.recount_post_counters(new.post_id);
    elsif old.deleted_at is distinct from new.deleted_at then
      perform public.recount_post_counters(new.post_id);
    end if;
    return new;
  end if;

  return null;
end;
$$;

create or replace function public.tg_recount_report_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recount_post_counters(new.post_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.recount_post_counters(old.post_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.post_id is distinct from new.post_id then
      perform public.recount_post_counters(old.post_id);
      perform public.recount_post_counters(new.post_id);
    else
      perform public.recount_post_counters(new.post_id);
    end if;
    return new;
  end if;

  return null;
end;
$$;

revoke all on function public.tg_recount_upvote_counters() from public, anon, authenticated;
revoke all on function public.tg_recount_comment_counters() from public, anon, authenticated;
revoke all on function public.tg_recount_report_counters() from public, anon, authenticated;

drop trigger if exists upvotes_recount_post_counters on public.upvotes;
create trigger upvotes_recount_post_counters
after insert or update or delete on public.upvotes
for each row execute function public.tg_recount_upvote_counters();

drop trigger if exists comments_recount_post_counters on public.comments;
create trigger comments_recount_post_counters
after insert or update or delete on public.comments
for each row execute function public.tg_recount_comment_counters();

drop trigger if exists reports_recount_post_counters on public.reports;
create trigger reports_recount_post_counters
after insert or update or delete on public.reports
for each row execute function public.tg_recount_report_counters();

drop trigger if exists visitor_reports_recount_post_counters on public.visitor_reports;
create trigger visitor_reports_recount_post_counters
after insert or update or delete on public.visitor_reports
for each row execute function public.tg_recount_report_counters();

drop function if exists public.get_public_posts(integer, timestamp with time zone, uuid);

create or replace function public.get_public_posts(
  limit_count integer default 50,
  cursor_created_at timestamp with time zone default null,
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_name text,
  author_color text,
  upvote_count bigint,
  comment_count bigint,
  report_count bigint,
  image_url text,
  image_key text,
  image_width integer,
  image_height integer,
  image_size integer,
  image_thumbnail_url text,
  image_thumbnail_key text,
  image_thumbnail_width integer,
  image_thumbnail_height integer,
  image_thumbnail_size integer
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
    coalesce(p.upvote_count, 0)::bigint as upvote_count,
    coalesce(p.comment_count, 0)::bigint as comment_count,
    coalesce(p.report_count, 0)::bigint as report_count,
    p.image_url,
    p.image_key,
    p.image_width,
    p.image_height,
    p.image_size,
    p.image_thumbnail_url,
    p.image_thumbnail_key,
    p.image_thumbnail_width,
    p.image_thumbnail_height,
    p.image_thumbnail_size
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

grant execute on function public.get_public_posts(integer, timestamp with time zone, uuid) to anon, authenticated;

create or replace view public.posts_with_meta as
select
  p.id,
  case when p.anonymous then null::uuid else p.author_id end as author_id,
  p.category,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  case when p.anonymous then null::text else p.author_name_cached end as author_name,
  case when p.anonymous then null::text else p.author_color_cached end as author_color,
  coalesce(p.upvote_count, 0)::bigint as upvote_count,
  coalesce(p.comment_count, 0)::bigint as comment_count,
  coalesce(p.report_count, 0)::bigint as report_count,
  p.image_url,
  p.image_key,
  p.image_width,
  p.image_height,
  p.image_size,
  p.image_thumbnail_url,
  p.image_thumbnail_key,
  p.image_thumbnail_width,
  p.image_thumbnail_height,
  p.image_thumbnail_size
from public.posts p
where p.status = any (array['active'::text, 'reported'::text]);

create or replace view public.my_posts_with_meta as
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
  p.author_name_cached as author_name,
  p.author_color_cached as author_color,
  coalesce(p.upvote_count, 0)::bigint as upvote_count,
  coalesce(p.comment_count, 0)::bigint as comment_count,
  coalesce(p.report_count, 0)::bigint as report_count,
  p.image_url,
  p.image_key,
  p.image_width,
  p.image_height,
  p.image_size,
  p.image_thumbnail_url,
  p.image_thumbnail_key,
  p.image_thumbnail_width,
  p.image_thumbnail_height,
  p.image_thumbnail_size
from public.posts p;

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
