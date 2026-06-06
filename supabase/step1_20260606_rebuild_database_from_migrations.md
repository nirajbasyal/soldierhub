# Step 1 — Rebuild Soldier Hub Database From Migrations

This is a beginner guide for rebuilding the Soldier Hub Supabase database from scratch.

This file is documentation only. It is not a migration and should not be pasted into Supabase SQL Editor.

The real executable SQL source of truth is:

```txt
supabase/migrations/
```

## What this rebuild recreates

The migration files are responsible for recreating the database structure the app needs:

```txt
extensions
tables
columns
primary keys
foreign keys
check constraints
indexes
functions
triggers
views
grants
RLS policies
```

The migrations do not recreate real production user data, uploaded Cloudflare R2 files, Vercel settings, Sentry settings, or Supabase dashboard Auth settings.

## Best rebuild method

Use the Supabase CLI.

```bash
git clone https://github.com/nirajbasyal/soldierhub.git
cd soldierhub
npm install -g supabase
supabase login
supabase link --project-ref NEW_PROJECT_REF
supabase db push
```

`supabase db push` applies the SQL files in `supabase/migrations/` in timestamp order.

The first migration file should be the baseline/core schema. Later files apply improvements, functions, triggers, indexes, policies, security cleanup, and the final `verification_status` cleanup.

## Manual copy-paste method

Use this only if the CLI is not working.

1. Open the GitHub repo.
2. Open `supabase/migrations/`.
3. Sort files by filename from oldest to newest.
4. Open the first `.sql` migration file.
5. Copy all SQL in that file.
6. Paste it into Supabase SQL Editor.
7. Run it.
8. Move to the next migration file.
9. Repeat until every migration has been run.
10. Stop immediately if any migration errors.

Do not run `seed.sql` against production unless you intentionally reviewed it.

## Future migration naming rule

Do not rename existing migrations.

For new migrations, keep the timestamp first and put the human step number after it:

```txt
YYYYMMDDHHMMSS_stepNN_short_description.sql
```

Example:

```txt
20260607090000_step01_add_new_table.sql
20260607093000_step02_add_new_policy.sql
```

Do not create real migration files that start with only `step1_`. Supabase expects migration files to stay timestamp ordered.

## After rebuild: update environment variables

A new Supabase project has new keys and URL.

Update Vercel and local `.env` values:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY if used by server-only code
```

Never place the service role key in frontend/browser code.

## After rebuild: recheck dashboard/external settings

Database migrations do not recreate every dashboard or external setting.

Check:

```txt
Supabase Auth redirect URLs
Supabase Auth email templates/settings
OAuth provider settings if used
Cloudflare R2 bucket and credentials
Vercel environment variables
Sentry environment variables
Realtime settings if manually changed
Edge function secrets if any
```

## After rebuild: smoke test

Test these before trusting the rebuilt project:

```txt
signup/login
auth callback
pending review
admin approve/reject/revoke
create post
edit/delete post
comment
upvote
follow/unfollow
notifications
image upload
public profile pages
```

## After rebuild: SQL health checks

Run these in Supabase SQL Editor.

### Confirm profile verification cleanup

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('status', 'verification_status')
order by column_name;
```

Expected result:

```txt
verification_status
```

### Confirm main tables and RLS

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

Expected main tables:

```txt
comments
notifications
posts
profile_follows
profiles
reports
resources
upvotes
visitor_reports
```

Every app table above should have `rls_enabled = true`.

### Confirm profile follow policies

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'profile_follows'
order by policyname;
```

Expected policies:

```txt
profile_follows_delete_own
profile_follows_insert_own_verified
profile_follows_select_self_only
```

## Important final rule

After this cleanup, treat `supabase/migrations/` as the database truth. If a database change is not in migrations, it is not officially part of Soldier Hub.
