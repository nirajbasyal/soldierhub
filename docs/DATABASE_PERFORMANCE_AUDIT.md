# Soldier Hub Database Performance Audit

This is a **read-only** Supabase/Postgres audit for production readiness. It does not insert, update, delete, create, alter, drop, or truncate anything.

Use this audit before adding more indexes or changing RLS policies. The goal is to inspect the real database first, then only make safe targeted performance improvements.

## How to run

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Create a new query.
4. Paste the SQL below.
5. Run it.
6. Copy the result table and review it before making any migration.

Do not paste any secret keys, JWTs, environment variables, or private user content into public tickets or PRs.

## Read-only audit SQL

```sql
-- Soldier Hub production database performance audit
-- READ ONLY: this query only reads Postgres catalogs/statistics.
-- It does not modify schema, RLS, indexes, or user data.

with target_tables(table_name) as (
  values
    ('profiles'),
    ('posts'),
    ('comments'),
    ('upvotes'),
    ('reports'),
    ('notifications'),
    ('profile_follows'),
    ('visitor_reports')
),
public_tables as (
  select
    c.oid,
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    coalesce(s.n_live_tup, 0) as live_rows_estimate,
    coalesce(s.n_dead_tup, 0) as dead_rows_estimate,
    coalesce(s.seq_scan, 0) as seq_scan,
    coalesce(s.seq_tup_read, 0) as seq_tup_read,
    coalesce(s.idx_scan, 0) as idx_scan,
    pg_total_relation_size(c.oid) as total_bytes,
    pg_relation_size(c.oid) as table_bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_stat_user_tables s on s.relid = c.oid
  join target_tables tt on tt.table_name = c.relname
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
),
policy_counts as (
  select
    schemaname as schema_name,
    tablename as table_name,
    count(*) as policy_count
  from pg_policies
  where schemaname = 'public'
  group by schemaname, tablename
),
index_rows as (
  select
    t.schema_name,
    t.table_name,
    i.relname as index_name,
    ix.indisunique as is_unique,
    ix.indisprimary as is_primary,
    coalesce(st.idx_scan, 0) as idx_scan,
    pg_relation_size(i.oid) as index_bytes,
    pg_get_indexdef(ix.indexrelid) as index_definition,
    ix.indkey::text as index_key
  from public_tables t
  join pg_index ix on ix.indrelid = t.oid
  join pg_class i on i.oid = ix.indexrelid
  left join pg_stat_user_indexes st on st.indexrelid = i.oid
),
foreign_keys as (
  select
    con.conname as constraint_name,
    src_ns.nspname as schema_name,
    src.relname as table_name,
    array_agg(src_att.attname order by cols.ordinality) as fk_columns,
    string_agg(src_att.attname, ', ' order by cols.ordinality) as fk_columns_text,
    ref_ns.nspname as referenced_schema,
    ref.relname as referenced_table
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_namespace src_ns on src_ns.oid = src.relnamespace
  join pg_class ref on ref.oid = con.confrelid
  join pg_namespace ref_ns on ref_ns.oid = ref.relnamespace
  join unnest(con.conkey) with ordinality as cols(attnum, ordinality) on true
  join pg_attribute src_att on src_att.attrelid = src.oid and src_att.attnum = cols.attnum
  join target_tables tt on tt.table_name = src.relname
  where con.contype = 'f'
    and src_ns.nspname = 'public'
  group by con.conname, src_ns.nspname, src.relname, ref_ns.nspname, ref.relname
),
fk_index_check as (
  select
    fk.*,
    exists (
      select 1
      from pg_index ix
      join pg_class src on src.relname = fk.table_name
      join pg_namespace src_ns on src_ns.oid = src.relnamespace and src_ns.nspname = fk.schema_name
      where ix.indrelid = src.oid
        and (
          select array_agg(att.attname order by key_ord.ordinality)
          from unnest(ix.indkey) with ordinality as key_ord(attnum, ordinality)
          join pg_attribute att on att.attrelid = src.oid and att.attnum = key_ord.attnum
          where key_ord.ordinality <= array_length(fk.fk_columns, 1)
        ) = fk.fk_columns
    ) as has_leading_index
  from foreign_keys fk
),
function_rows as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    case p.prosecdef when true then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security_mode,
    p.provolatile as volatility,
    p.proparallel as parallel_safety
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
view_rows as (
  select
    v.schemaname as schema_name,
    v.viewname as view_name,
    case
      when lower(pg_get_viewdef(format('%I.%I', v.schemaname, v.viewname)::regclass, true)) like '%security_invoker%'
        then 'security_invoker mentioned in view definition/options'
      else 'verify security mode in Supabase dashboard if warning appears'
    end as security_note
  from pg_views v
  where v.schemaname = 'public'
    and v.viewname in (
      'posts_with_meta',
      'my_posts_with_meta',
      'public_profiles',
      'profile_follow_counts'
    )
)
select
  '01_table_size_and_scan_stats' as audit_section,
  t.table_name as object_name,
  case
    when t.seq_scan > greatest(t.idx_scan * 3, 50) and t.live_rows_estimate > 1000 then 'review_seq_scan'
    when t.dead_rows_estimate > greatest(t.live_rows_estimate / 5, 1000) then 'review_dead_rows'
    else 'ok'
  end as priority,
  jsonb_build_object(
    'schema', t.schema_name,
    'live_rows_estimate', t.live_rows_estimate,
    'dead_rows_estimate', t.dead_rows_estimate,
    'seq_scan', t.seq_scan,
    'seq_tup_read', t.seq_tup_read,
    'idx_scan', t.idx_scan,
    'total_size', pg_size_pretty(t.total_bytes),
    'table_size', pg_size_pretty(t.table_bytes)
  ) as details
from public_tables t

union all

select
  '02_rls_status' as audit_section,
  t.table_name as object_name,
  case
    when not t.rls_enabled then 'high_review_rls_disabled'
    else 'ok'
  end as priority,
  jsonb_build_object(
    'schema', t.schema_name,
    'rls_enabled', t.rls_enabled,
    'rls_forced', t.rls_forced,
    'policy_count', coalesce(pc.policy_count, 0)
  ) as details
from public_tables t
left join policy_counts pc on pc.schema_name = t.schema_name and pc.table_name = t.table_name

union all

select
  '03_rls_policy_list' as audit_section,
  p.tablename || '.' || p.policyname as object_name,
  'review' as priority,
  jsonb_build_object(
    'schema', p.schemaname,
    'table', p.tablename,
    'policy', p.policyname,
    'command', p.cmd,
    'roles', p.roles,
    'using_expression', p.qual,
    'check_expression', p.with_check
  ) as details
from pg_policies p
join target_tables tt on tt.table_name = p.tablename
where p.schemaname = 'public'

union all

select
  '04_index_inventory' as audit_section,
  ir.table_name || '.' || ir.index_name as object_name,
  case
    when ir.idx_scan = 0 and not ir.is_primary and not ir.is_unique then 'review_unused_after_real_traffic'
    else 'ok'
  end as priority,
  jsonb_build_object(
    'schema', ir.schema_name,
    'table', ir.table_name,
    'index', ir.index_name,
    'is_primary', ir.is_primary,
    'is_unique', ir.is_unique,
    'idx_scan', ir.idx_scan,
    'index_size', pg_size_pretty(ir.index_bytes),
    'definition', ir.index_definition
  ) as details
from index_rows ir

union all

select
  '05_missing_fk_leading_index_check' as audit_section,
  fk.table_name || '.' || fk.constraint_name as object_name,
  case
    when fk.has_leading_index then 'ok'
    else 'high_add_index_candidate'
  end as priority,
  jsonb_build_object(
    'schema', fk.schema_name,
    'table', fk.table_name,
    'foreign_key_columns', fk.fk_columns_text,
    'referenced_table', fk.referenced_schema || '.' || fk.referenced_table,
    'has_leading_index', fk.has_leading_index
  ) as details
from fk_index_check fk

union all

select
  '06_possible_duplicate_indexes' as audit_section,
  a.table_name || '.' || a.index_name || ' / ' || b.index_name as object_name,
  'review_duplicate_candidate' as priority,
  jsonb_build_object(
    'schema', a.schema_name,
    'table', a.table_name,
    'index_1', a.index_name,
    'index_2', b.index_name,
    'index_1_size', pg_size_pretty(a.index_bytes),
    'index_2_size', pg_size_pretty(b.index_bytes),
    'index_1_definition', a.index_definition,
    'index_2_definition', b.index_definition
  ) as details
from index_rows a
join index_rows b
  on b.schema_name = a.schema_name
 and b.table_name = a.table_name
 and b.index_name > a.index_name
 and b.index_key = a.index_key
where not (a.is_primary or b.is_primary)

union all

select
  '07_public_functions' as audit_section,
  fr.function_name || '(' || fr.arguments || ')' as object_name,
  case
    when fr.security_mode = 'SECURITY DEFINER' then 'review_security_definer'
    else 'ok'
  end as priority,
  jsonb_build_object(
    'schema', fr.schema_name,
    'function', fr.function_name,
    'arguments', fr.arguments,
    'security_mode', fr.security_mode,
    'volatility', fr.volatility,
    'parallel_safety', fr.parallel_safety
  ) as details
from function_rows fr

union all

select
  '08_public_views' as audit_section,
  vr.view_name as object_name,
  'review_view_security' as priority,
  jsonb_build_object(
    'schema', vr.schema_name,
    'view', vr.view_name,
    'security_note', vr.security_note
  ) as details
from view_rows vr

order by audit_section, priority desc, object_name;
```

## How to interpret the result

### Safe / normal

- `ok` means the item does not immediately look dangerous from this audit.
- `review_unused_after_real_traffic` does not automatically mean delete the index. It may simply mean the app has not had enough real production traffic yet.
- `review_security_definer` does not automatically mean bad. Some public feed views/RPCs may intentionally use security definer, but each one should be reviewed carefully.

### Highest priority rows to paste for review

Paste rows marked:

- `high_review_rls_disabled`
- `high_add_index_candidate`
- `review_seq_scan`
- `review_dead_rows`
- `review_duplicate_candidate`
- `review_security_definer`

## Rules before changing the database

1. Do not add indexes blindly.
2. Do not drop indexes based only on `idx_scan = 0` unless the app has meaningful real traffic and the index is clearly duplicate/unneeded.
3. Do not change RLS policies without testing login, feed, comments, profile, admin, reports, and notifications immediately after.
4. Any production index migration should use `create index concurrently` when possible.
5. Any risky SQL change should be stored in `supabase/migrations/` before or immediately after running in Supabase SQL Editor.

## Hot paths we care about for Soldier Hub

- Feed loading from `posts` / `posts_with_meta`
- Reply loading from `comments`
- Upvote add/remove from `upvotes`
- Report flow from `reports` and `visitor_reports`
- Notification unread count and notification list from `notifications`
- Profile page and follow/following lists from `profiles` and `profile_follows`
- Admin verification/moderation from `profiles`, `posts`, and `reports`
