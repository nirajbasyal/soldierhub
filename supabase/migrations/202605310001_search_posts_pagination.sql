begin;

set local lock_timeout = '5s';
set local statement_timeout = '45s';
set local search_path = public, extensions;

create extension if not exists pg_trgm with schema extensions;

create index if not exists posts_search_body_trgm_idx
  on public.posts using gin (lower(coalesce(body, '')) extensions.gin_trgm_ops)
  where status in ('active', 'reported');

create index if not exists posts_search_category_trgm_idx
  on public.posts using gin (lower(coalesce(category, '')) extensions.gin_trgm_ops)
  where status in ('active', 'reported');

create index if not exists posts_search_author_name_trgm_idx
  on public.posts using gin (lower(coalesce(author_name_cached, '')) extensions.gin_trgm_ops)
  where anonymous is false
    and status in ('active', 'reported');

create index if not exists posts_search_created_id_idx
  on public.posts (created_at desc, id desc)
  where status in ('active', 'reported');

create or replace function public.search_public_posts(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
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
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  clean_query text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if length(clean_query) < 2 then
    return;
  end if;

  return query
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
        lower(coalesce(p.body, '')) like '%' || clean_query || '%'
        or lower(coalesce(p.category, '')) like '%' || clean_query || '%'
        or (
          p.anonymous is false
          and lower(coalesce(p.author_name_cached, '')) like '%' || clean_query || '%'
        )
      )
    order by
      case when lower(coalesce(p.category, '')) = clean_query then 0 else 1 end,
      case when lower(coalesce(p.category, '')) like clean_query || '%' then 0 else 1 end,
      case
        when p.anonymous is false
          and lower(coalesce(p.author_name_cached, '')) like clean_query || '%'
        then 0
        else 1
      end,
      p.created_at desc,
      p.id desc
    offset safe_offset
    limit safe_limit;
end;
$$;

revoke all on function public.search_public_posts(text, integer, integer) from public;
grant execute on function public.search_public_posts(text, integer, integer) to anon, authenticated;

create or replace function public.search_verified_profiles(
  p_query text,
  p_limit integer default 8,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  avatar_color text,
  avatar_url text,
  base text,
  match_type text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_query text := trim(coalesce(p_query, ''));
  clean_query_lower text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 8), 1), 25);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  looks_like_email boolean := trim(coalesce(p_query, '')) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$';
begin
  if auth.uid() is null then
    raise exception 'Please sign in before searching member profiles.';
  end if;

  if not public.is_verified_profile(auth.uid()) then
    raise exception 'Verified account required to search member profiles.';
  end if;

  if length(clean_query) < 2 then
    return;
  end if;

  return query
    select
      p.id,
      coalesce(p.full_name, 'SoldierHub member')::text as full_name,
      coalesce(p.avatar_color, '#314A66')::text as avatar_color,
      p.avatar_url::text as avatar_url,
      coalesce(p.base, 'Fort Bliss')::text as base,
      case
        when looks_like_email and lower(coalesce(p.email, '')) = clean_query_lower then 'email'
        else 'name'
      end::text as match_type
    from public.profiles p
    where p.status = 'verified'
      and p.verification_status = 'verified'
      and (
        (p.full_name is not null and lower(p.full_name) like clean_query_lower || '%')
        or
        (looks_like_email and p.email is not null and lower(p.email) = clean_query_lower)
      )
    order by
      case when looks_like_email and lower(coalesce(p.email, '')) = clean_query_lower then 0 else 1 end,
      case when lower(coalesce(p.full_name, '')) = clean_query_lower then 0 else 1 end,
      p.full_name asc,
      p.updated_at desc nulls last,
      p.created_at desc nulls last
    offset safe_offset
    limit safe_limit;
end;
$$;

create or replace function public.search_verified_profiles_by_name(
  p_query text,
  p_limit integer default 8,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  avatar_color text,
  avatar_url text,
  base text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.full_name, s.avatar_color, s.avatar_url, s.base
  from public.search_verified_profiles(p_query, p_limit, p_offset) s
  where s.match_type = 'name';
$$;

revoke all on function public.search_verified_profiles(text, integer, integer) from public;
revoke all on function public.search_verified_profiles(text, integer, integer) from anon;
grant execute on function public.search_verified_profiles(text, integer, integer) to authenticated;

revoke all on function public.search_verified_profiles_by_name(text, integer, integer) from public;
revoke all on function public.search_verified_profiles_by_name(text, integer, integer) from anon;
grant execute on function public.search_verified_profiles_by_name(text, integer, integer) to authenticated;

commit;
