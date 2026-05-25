# SoldierHub Supabase Database Guide

This folder contains database-related files for SoldierHub.

SoldierHub is an independent, unofficial community platform and is not affiliated with, endorsed by, or operated by the U.S. Government, Department of Defense, Department of the Army, or any military installation.

## Production safety rule

Do **not** run random SQL files directly in the Supabase SQL Editor just because they exist in this repository.

Some SQL files may be historical snapshots, local setup helpers, or archived emergency fixes. Running an old file against production can overwrite newer functions, views, grants, policies, or columns.

## Source of truth going forward

Use this priority order:

1. `supabase/migrations/`
   - Preferred source of truth for database changes.
   - New database changes should be added here as timestamped migrations.

2. `supabase/schema.sql`
   - Snapshot/reference of the database structure.
   - Useful for review and local setup, but should not be treated as a random production patch file.

3. `supabase/policies.sql`
   - Reference for Row Level Security policies and grants.
   - Review carefully before running against production.

4. `supabase/seed.sql`
   - Demo or starter data only.
   - Do not run against production unless the contents are intentionally production-safe.

5. `supabase/archive/`
   - Historical SQL files only.
   - Files here are preserved for reference.
   - Do **not** run archived SQL without carefully reviewing the current live database and current migrations.

## Before changing production database

Before running any SQL in production:

1. Confirm what the app currently expects.
2. Confirm whether the same change already exists in `supabase/migrations/`.
3. Test the SQL in a non-production Supabase project if possible.
4. Make a backup or export before destructive changes.
5. Prefer small, reversible migrations over large all-in-one fixes.

## Do not run archived emergency fixes

Emergency fix files may include statements like:

- `create or replace function`
- `create or replace view`
- `drop view`
- `drop function`
- `grant` / `revoke`
- `alter table`

These can be valid at the time they were written, but dangerous later.

## Current cleanup note

The old one-time file:

```txt
supabase/fix-delete-post-and-report-counts.sql
```

was moved to:

```txt
supabase/archive/fix-delete-post-and-report-counts.ARCHIVED-DO-NOT-RUN.sql
```

It should be treated as historical reference only.
