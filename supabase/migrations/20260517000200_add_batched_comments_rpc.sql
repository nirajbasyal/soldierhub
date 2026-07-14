-- ============================================================================
-- SoldierHub fix: batched public comments RPC
-- ============================================================================
-- Adds public.get_public_comments_for_posts(uuid[], integer).
-- Purpose: load comments for many feed posts in one Supabase RPC call instead
-- of one RPC call per post.
--
-- Important privacy rule preserved:
-- If a post is anonymous and the post author comments on that same post,
-- the public response masks the real author_id/name and uses the anonymous
-- post label instead.
-- ============================================================================

begin;

create or replace function public.get_anonymous_post_label(p_post_id uuid)
returns text
language sql
immutable
set search_path = public
as $$
  select 'Anonymous' ||
    lpad(
      (
        coalesce(
          (
            select sum(ascii(substr(p_post_id::text, i, 1)) * i)
            from generate_series(1, length(p_post_id::text)) as s(i)
          ),
          0
        )::bigint % 10000
      )::text,
      4,
      '0'
    );
$$;

create or replace function public.get_public_comments_for_posts(
  target_post_ids uuid[],
  per_post_limit integer default 50
) returns table(
  id uuid,
  post_id uuid,
  author_id uuid,
  body text,
  created_at timestamp with time zone,
  author_name_cached text,
  author_color_cached text,
  is_anonymous_author boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with ranked as (
    select
      c.id,
      c.post_id,
      case
        when coalesce(p.anonymous, false) = true
          and c.author_id = p.author_id
          then null
        else c.author_id
      end as author_id,
      c.body,
      c.created_at,
      case
        when coalesce(p.anonymous, false) = true
          and c.author_id = p.author_id
          then public.get_anonymous_post_label(p.id)
        else coalesce(c.author_name_cached, 'Member')
      end as author_name_cached,
      case
        when coalesce(p.anonymous, false) = true
          and c.author_id = p.author_id
          then '#5C6470'
        else coalesce(c.author_color_cached, '#314A66')
      end as author_color_cached,
      (
        coalesce(p.anonymous, false) = true
        and c.author_id = p.author_id
      ) as is_anonymous_author,
      row_number() over (
        partition by c.post_id
        order by c.created_at asc, c.id asc
      ) as rn
    from public.comments c
    join public.posts p
      on p.id = c.post_id
    where c.post_id = any(coalesce(target_post_ids, array[]::uuid[]))
      and c.deleted_at is null
      and p.status in ('active', 'reported')
  )
  select
    ranked.id,
    ranked.post_id,
    ranked.author_id,
    ranked.body,
    ranked.created_at,
    ranked.author_name_cached,
    ranked.author_color_cached,
    ranked.is_anonymous_author
  from ranked
  where ranked.rn <= greatest(1, least(coalesce(per_post_limit, 50), 100))
  order by ranked.post_id, ranked.created_at asc, ranked.id asc;
$$;

revoke all on function public.get_public_comments_for_posts(uuid[], integer) from public;
grant execute on function public.get_public_comments_for_posts(uuid[], integer) to anon, authenticated;

-- Ask PostgREST/Supabase API to refresh its function cache.
notify pgrst, 'reload schema';

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
