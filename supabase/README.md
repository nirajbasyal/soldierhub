# Soldier Hub Supabase Database Guide

This folder is the database source-of-truth area for Soldier Hub.

Soldier Hub is an independent, unofficial community platform and is not affiliated with, endorsed by, or operated by the U.S. Government, Department of Defense, Department of the Army, or any military installation.

## Production source of truth

`supabase/migrations/` is the only production source of truth for database structure and database changes.

For a brand-new Supabase project, rebuild the database by applying every timestamped SQL file in `supabase/migrations/` from oldest to newest.

`supabase/migration-history.lock.json` makes that history immutable. CI checks
every migration filename and SHA-256 digest so duplicate versions, renamed
files, deleted files, and edits to applied SQL fail before merge.

CI also starts a disposable local Supabase stack and runs `supabase db reset`.
This proves the complete chain can rebuild an empty database before a change is
allowed onto `main`.

The first baseline migration creates the core database foundation. Later migrations evolve it to the current production shape.

The migration chain must recreate every database object the app needs:

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

`seed.sql` is not production history. It is optional local/demo helper data only.

## Current clean folder structure

Keep the active Supabase folder simple:

```txt
supabase/
  README.md
  seed.sql
  step1_20260606_rebuild_database_from_migrations.md
  migrations/
```

Do not use random SQL copied from chat, dashboard history, or old local notes as the source of truth. If a database change is real, it must be represented as a timestamped migration inside `supabase/migrations/`.

## Important current verification-status state

`public.profiles.verification_status` is the canonical profile verification field.

The old `public.profiles.status` column was removed by:

```txt
supabase/migrations/20260606203000_stage2c_drop_profiles_status.sql
```

Do not reintroduce `profiles.status` in app code, database functions, policies, views, triggers, indexes, or future migrations.

`posts.status` and `reports.status` are different concepts and should stay.

## Beginner-safe workflow for future database changes

1. Create a migration file:

   ```bash
   supabase migration new step01_describe_the_change
   ```

2. Put the exact SQL change in the new file inside `supabase/migrations/`.
3. Test locally or in a Supabase branch when possible.
4. Apply it to the linked Supabase project:

   ```bash
   supabase db push
   ```

5. Commit and push:

   ```bash
   git add supabase/migrations
   git commit -m "Add database migration"
   git push
   ```

6. Smoke test login, admin, posts, comments, follows, uploads, notifications, and profile pages.

## Migration filename rule

Do not rename existing migrations after they have been applied.

Supabase migration files must keep the timestamp first:

```txt
YYYYMMDDHHMMSS_short_description.sql
```

For future migrations, use a human step number after the timestamp:

```txt
YYYYMMDDHHMMSS_stepNN_short_description.sql
```

Example:

```txt
20260607090000_step01_add_new_table.sql
20260607093000_step02_add_new_policy.sql
```

Do not start a real migration filename with only `step1_`. The timestamp must stay first so Supabase can run files in order.

Every version must contain exactly 14 digits and must be unique. After creating
or intentionally changing the migration set, refresh the lock:

```bash
npm run migrations:lock
```

After a production push, record the newest version verified in production:

```bash
npm run migrations:lock -- 20260714144013
supabase migration list --linked
```

The local and remote columns must contain the same versions. Do not apply a
production migration under a different timestamp. If an emergency or dashboard
change creates a remote-only version, fetch that exact history immediately and
reconcile it before another migration is added.

## Rebuild a brand-new Supabase project from GitHub

Use this if the old Supabase project is deleted or you intentionally create a new Supabase project.

### Step 1 — clone the repo

```bash
git clone https://github.com/nirajbasyal/soldierhub.git
cd soldierhub
```

### Step 2 — install and login

```bash
npm install -g supabase
supabase login
```

### Step 3 — link the new Supabase project

```bash
supabase link --project-ref NEW_PROJECT_REF
```

`NEW_PROJECT_REF` comes from the new Supabase dashboard URL.

### Step 4 — apply migrations

```bash
supabase db push
```

This applies all SQL files in `supabase/migrations/` in timestamp order.

### Step 5 — update app environment variables

Update local/Vercel environment variables to point to the new Supabase project. Keep private server keys private. Never place private server keys in browser/frontend code.

### Step 6 — manually recheck non-database settings

Migrations recreate the database. They do not automatically recreate every external/dashboard setting.

Check:

```txt
Supabase Auth redirect URLs
Supabase Auth email settings/templates
OAuth providers if used
Cloudflare R2 bucket and credentials
Vercel environment variables
Sentry environment variables
Realtime settings if changed
Edge function secrets if any
```

### Step 7 — smoke test

After deploy, test:

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

## Manual copy-paste restore fallback

Preferred method is `supabase db push`.

Only if the CLI is not available:

1. Open GitHub.
2. Go to `supabase/migrations/`.
3. Sort files by filename from oldest to newest.
4. Open the first SQL file.
5. Copy the entire SQL content.
6. Paste it into Supabase SQL Editor.
7. Run it.
8. Repeat every migration file in order.
9. If one file errors, stop and fix it before continuing.
10. Do not run `seed.sql` against production unless intentionally reviewed.

## Read-only health checks

Run these checks in Supabase SQL Editor when you want to verify that the live database matches the intended current shape.

### Confirm old profile status column is gone

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

### Confirm main public tables exist and RLS is enabled

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

Every app table above should show `rls_enabled = true`.

### Confirm profile follow policies are not duplicated

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

### Confirm core public views exist

```sql
select table_name
from information_schema.views
where table_schema = 'public'
order by table_name;
```

Expected views:

```txt
my_posts_with_meta
posts_with_meta
profile_follow_counts
public_profiles
```

### Confirm profile status dependencies are gone

```sql
select
  d.classid::regclass::text as dependent_catalog,
  d.objid,
  d.deptype
from pg_depend d
join pg_class c on c.oid = d.refobjid
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum = d.refobjsubid
where n.nspname = 'public'
  and c.relname = 'profiles'
  and a.attname = 'status';
```

Expected result: no rows, because `profiles.status` should not exist.

## Before changing production

Before running SQL against production:

1. Confirm the app code expects the change.
2. Confirm the change is represented in `supabase/migrations/`.
3. Back up or export production if the change is destructive.
4. Prefer small, reviewable migrations over large manual SQL edits.
5. After deploy, smoke test login, admin, posts, comments, follows, uploads, and notifications.
