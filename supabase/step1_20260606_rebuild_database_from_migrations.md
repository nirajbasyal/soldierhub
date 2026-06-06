# Step 1 — Rebuild Soldier Hub Database From Migrations

This is a beginner guide for rebuilding the Soldier Hub Supabase database.

This file is documentation only. It is not a migration.

The real executable SQL source of truth is:

```txt
supabase/migrations/
```

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

## Manual copy-paste method

Use this only if the CLI is not working.

1. Open the GitHub repo.
2. Open `supabase/migrations/`.
3. Sort files by filename from oldest to newest.
4. Open the first SQL file.
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

## What migrations should recreate

The migration chain should recreate:

```txt
schemas
tables
columns
primary keys
foreign keys
check constraints
indexes
functions
triggers
views
RLS policies
grants
```

Migrations do not recreate production user data, uploaded files, or app hosting settings.

## After rebuild smoke test

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
