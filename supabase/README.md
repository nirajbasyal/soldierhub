# Soldier Hub Supabase Database Guide

This folder contains the database source of truth for Soldier Hub.

Soldier Hub is an independent, unofficial community platform and is not affiliated with, endorsed by, or operated by the U.S. Government, Department of Defense, Department of the Army, or any military installation.

## Production source of truth

`supabase/migrations/` is the only production source of truth for database structure and database changes.

A fresh Supabase database should be rebuilt by applying the timestamped SQL files in `supabase/migrations/` in order.

Those migration files are responsible for recreating the schema, tables, functions, triggers, indexes, views, grants, and RLS policies.

Do not rebuild production from old snapshots, copied SQL, archived fixes, pending migrations, or SQL pasted from chat history.

## What belongs here

```txt
supabase/
  README.md
  seed.sql
  migrations/
```

- `migrations/` — production database history and rebuild source.
- `seed.sql` — optional local/demo seed helper only. Never treat seed data as production migration history.
- `README.md` — human instructions only.

## What must stay deleted

Do not bring these back as active production SQL:

```txt
supabase/schema.sql
supabase/policies.sql
supabase/live-policies-*.json
supabase/archive/
supabase/pending_migrations/
supabase/production_rebuild/
```

Those files/folders were removed because they could become stale while live Supabase changed.

## Migration filename rule

Do not rename old migration files after they have been applied.

Supabase migration files must keep the timestamp first, for example:

```txt
20260606203000_stage2c_drop_profiles_status.sql
```

For future migrations, use this style:

```txt
YYYYMMDDHHMMSS_stepNN_short_description.sql
```

Example:

```txt
20260607090000_step01_add_new_table.sql
20260607093000_step02_add_new_policy.sql
```

Do not start a real migration filename with only `step1_`. The timestamp must stay first so Supabase can run files in order.

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

## Rebuild a brand-new Supabase project from GitHub

Use this if the old Supabase project is deleted or you intentionally create a new Supabase project.

### Step 1 — clone the repo

```bash
git clone https://github.com/nirajbasyal/soldierhub.git
cd soldierhub
```

### Step 2 — login and link Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref NEW_PROJECT_REF
```

`NEW_PROJECT_REF` comes from the new Supabase dashboard URL.

### Step 3 — apply migrations

```bash
supabase db push
```

This applies all SQL files in `supabase/migrations/` in timestamp order.

### Step 4 — update app environment variables

Update local/Vercel environment variables to point to the new Supabase project. Keep private server keys private. Never place private server keys in browser/frontend code.

### Step 5 — manually recheck non-database settings

Migrations recreate the database. They do not automatically recreate every external/dashboard setting.

Check:

```txt
Supabase Auth redirect URLs
Supabase Auth email settings/templates
OAuth providers if used
Storage/R2 bucket settings
Cloudflare R2 credentials
Vercel environment variables
Sentry environment variables
Realtime settings if changed
Edge function secrets if any
```

### Step 6 — smoke test

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

## Temporary one-file copy-paste bundle

If you want one temporary SQL file for copy-paste, generate it locally and do not commit it.

PowerShell:

```powershell
Get-ChildItem .\supabase\migrations\*.sql | Sort-Object Name | Get-Content | Set-Content .\supabase_rebuild_bundle_DO_NOT_COMMIT.sql
```

Mac/Linux/Git Bash:

```bash
cat $(find supabase/migrations -type f -name "*.sql" | sort) > supabase_rebuild_bundle_DO_NOT_COMMIT.sql
```

The generated bundle is temporary only. The real source of truth remains `supabase/migrations/`.

## Current verification-status cleanup

`public.profiles.verification_status` is the canonical profile verification field.

The legacy `public.profiles.status` column was removed by:

```txt
supabase/migrations/20260606203000_stage2c_drop_profiles_status.sql
```

Do not reintroduce `profiles.status` in app code, functions, policies, views, triggers, indexes, or future migrations.

`posts.status` and `reports.status` are different concepts and should stay.

## Quick health checks

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

### Confirm main public tables exist

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
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

## Before changing production

Before running SQL against production:

1. Confirm the app code expects the change.
2. Confirm the change is represented in `supabase/migrations/`.
3. Back up or export production if the change is destructive.
4. Prefer small, reviewable migrations over large manual SQL edits.
5. After deploy, smoke test login, admin, posts, comments, follows, uploads, and notifications.
