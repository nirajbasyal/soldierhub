-- ============================================================================
-- ARCHIVED SOLDIERHUB SQL FILE — DO NOT RUN WITHOUT REVIEW
-- ============================================================================
--
-- Original file:
--   supabase/fix-delete-post-and-report-counts.sql
--
-- Why this file was archived:
--   This was a one-time emergency fix for post deletion and report counts.
--   It recreates important functions/views and changes grants. Running it again
--   later could overwrite newer database behavior.
--
-- Production rule:
--   Do not paste this into Supabase SQL Editor unless you have reviewed the
--   current live schema, current migrations, and current app expectations.
--
-- Current source of truth going forward:
--   Prefer files under supabase/migrations/ for database changes.
--
-- Archived on:
--   2026-05-24
-- ============================================================================

-- SoldierHub fix: post deletion + report count view permissions
-- Run this in Supabase SQL Editor if you are not using migrations.

begin;

create or replace function public.count_post_reports(p_post_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select count(*) from public.reports r where r.post_id = p_post_id), 0)
    +
    coalesce((select count(*) from public.visitor_reports vr where vr.post_id = p_post_id), 0);
$$;

revoke all on function public.count_post_reports(uuid) from public;
grant execute on function public.count_post_reports(uuid) to anon, authenticated;

create or replace function public.delete_own_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if auth.uid() is null then
    return false;
  end if;

  delete from public.posts p
  where p.id = p_post_id
    and (
      p.author_id = auth.uid()
      or public.is_admin()
    );

  get diagnostics deleted_count = row_count;

  return deleted_count > 0;
end;
$$;

revoke all on function public.delete_own_post(uuid) from public;
grant execute on function public.delete_own_post(uuid) to authenticated;

grant select on public.posts to authenticated;
grant insert on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant select on public.comments to anon, authenticated;
grant select on public.upvotes to anon, authenticated;
grant select on public.reports to authenticated;

create or replace view public.posts_with_meta
with (security_invoker = true) as
select
  p.id,
  case when p.anonymous then null else p.author_id end as author_id,
  p.category,
  p.title,
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
  public.count_post_reports(p.id) as report_count
from public.posts p
where p.status in ('active', 'reported');

create or replace view public.my_posts_with_meta
with (security_invoker = true) as
select
  p.id,
  p.author_id,
  p.category,
  p.title,
  p.body,
  p.anonymous,
  p.status,
  p.edited,
  p.created_at,
  p.updated_at,
  p.author_name_cached as author_name,
  p.author_color_cached as author_color,
  coalesce((select count(*) from public.upvotes u where u.post_id = p.id), 0) as upvote_count,
  coalesce((select count(*) from public.comments c where c.post_id = p.id), 0) as comment_count,
  public.count_post_reports(p.id) as report_count
from public.posts p;

grant select on public.posts_with_meta to anon, authenticated;
grant select on public.my_posts_with_meta to authenticated;

commit;
