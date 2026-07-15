# SoldierHub production runbook

This is the operator checklist for deploying, verifying, rolling back, and
recovering SoldierHub. The production application is on Vercel and the primary
database is Supabase project `ibavzficwjtdbyexuzkh`.

## Release gate

Do not deploy a schema change unless the pull request has passed all three
Prelaunch CI jobs:

1. clean database rebuild from every repository migration;
2. production dependency audit, lint, and Next.js build;
3. authenticated Auth/RLS/API/upload/rate-limit/MFA/browser tests.

The repository migration directory and `supabase/migration-history.lock.json`
are immutable production history. Never edit an applied migration. Create a new
forward migration and test a clean rebuild.

## Database deployment

The `Deploy production database` GitHub workflow is the only normal production
schema writer. Configure these GitHub `production` environment secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

The workflow is serialized, previews the push, applies pending migration files,
and lists local/remote history. Protect the `production` environment with a
required reviewer so an unexpected push cannot alter the database silently.

After deployment, verify:

- remote migration versions exactly match repository filenames;
- `profiles_protect_sensitive_fields` exists and is enabled;
- `authenticated` cannot insert/update posts or insert comments;
- browser roles cannot execute server-only admin/moderation RPCs;
- Supabase security advisors contain no unexplained findings.

## Application deployment verification

1. Confirm the Vercel production deployment is Ready.
2. Request `/api/health` and expect HTTP 200 with `ok: true`.
3. Check Sentry for a new release spike.
4. Complete the smoke flow with non-production accounts: sign in, publish,
   reply, upload an image, and delete the test content.
5. With the test admin, verify AAL1 admin APIs return
   `ADMIN_MFA_REQUIRED`; complete TOTP and verify profile queues and reported
   post actions work.
6. Confirm the response CSP has a unique `nonce-*`, `strict-dynamic`, and no
   script `unsafe-inline`.

## Rollback

Application rollback is a Vercel deployment rollback. Database migrations are
forward-only: write and review a compensating migration. Do not delete or edit
migration-history rows during an incident unless reconciling a proven history
record discrepancy and the schema state has been independently verified.

Before a destructive migration, take an export or confirm a restorable managed
backup. Prefer expand/migrate/contract changes so old and new application
versions can run during rollback.

## Backup and restore

Paid Supabase plans provide managed daily backups; enable Point-in-Time Recovery
when the required recovery-point objective becomes shorter than one day. On a
free project, schedule `supabase db dump` to encrypted off-site storage. Never
store production dumps as public or unencrypted GitHub artifacts.

Quarterly, restore the latest backup into an isolated project, run the migration
rebuild/integration suite, record recovery time, and delete the isolated copy.
The first successful drill establishes the actual RTO and RPO; until then,
backup readiness is unverified.

## Incident response

1. Preserve logs and identify the affected release and migration versions.
2. For active exploitation, disable the affected route/feature or roll back the
   application before investigating further.
3. Revoke exposed credentials and sessions; remember deleting a Supabase user
   does not invalidate already-issued JWTs.
4. Use Sentry, Vercel logs, Supabase logs/advisors, and profile status audit logs
   to determine scope.
5. Ship a tested forward fix, verify production metadata, and document the
   timeline and prevention action.

## Paid controls still required

Enable Supabase leaked-password protection after upgrading. Managed backup
retention and Point-in-Time Recovery also depend on plan and recovery needs.
