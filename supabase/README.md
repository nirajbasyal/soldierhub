# Soldier Hub Supabase Database Guide

This folder contains the database source of truth for Soldier Hub.

Soldier Hub is an independent, unofficial community platform and is not affiliated with, endorsed by, or operated by the U.S. Government, Department of Defense, Department of the Army, or any military installation.

## Production source of truth

`supabase/migrations/` is the only production source of truth for database structure and database changes.

A fresh Supabase database should be rebuilt by applying the timestamped SQL files in `supabase/migrations/` in order.

Do not rebuild production from old snapshots, copied SQL, archived fixes, or SQL pasted from chat history.

## Safe database workflow

For every future database change:

1. Create a new migration file in `supabase/migrations/`.
2. Put the exact SQL change in that migration.
3. Test locally or in a Supabase branch when possible.
4. Apply with `supabase db push` or the Supabase migration workflow.
5. Commit and push the migration file to GitHub.

## What belongs here

- `migrations/` — production database history and rebuild source.
- `seed.sql` — optional local/demo seed helper only. Never treat seed data as production migration history.

## What does not belong here anymore

Do not keep active production rebuild files outside `migrations/`.

Old files such as `schema.sql`, `policies.sql`, `production_rebuild/`, `pending_migrations/`, and pasted live-policy snapshots were removed or should remain out of the active source-of-truth path. They caused confusion because they could become stale while live Supabase changed.

## Before changing production

Before running SQL against production:

1. Confirm the app code expects the change.
2. Confirm the change is represented in `supabase/migrations/`.
3. Back up or export production if the change is destructive.
4. Prefer small, reviewable migrations over large manual SQL edits.
5. After deploy, smoke test login, admin, posts, comments, follows, uploads, and notifications.

## Current verification-status cleanup

`public.profiles.verification_status` is the canonical profile verification field.

The legacy `public.profiles.status` column was removed by the Stage 2C migration:

```txt
supabase/migrations/20260606203000_stage2c_drop_profiles_status.sql
```

Do not reintroduce `profiles.status` in app code, functions, policies, views, or future migrations.
