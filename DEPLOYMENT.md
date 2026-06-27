# Deployment Guide — SoldierHub production launch

This guide is the production checklist for launching **https://soldierhub.com** safely.

## Launch decision rule

Do not open public traffic until all of these are true:

- GitHub Actions or Vercel build passes from `main`.
- Live Supabase schema matches committed migrations.
- Every table in exposed schemas has RLS enabled.
- Required Vercel environment variables are present in Production, Preview, and Development.
- Admin signup, verification, posting, comments, uploads, reporting, and logout have been manually tested.

## Source of truth

For production, **do not rebuild the database by blindly running old snapshot files**.

The production database source of truth is:

```txt
supabase/migrations/
```

Run migrations in filename order. New live SQL changes must be added as new migration files and committed to GitHub so the repo and Supabase stay synced.

Do not re-run stale policy files after newer hardening migrations, because older broad policies can undo newer privacy/security fixes.

## Required Vercel environment variables

Set these in Vercel for **Production**, **Preview**, and **Development** unless noted.

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/publishable anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://soldierhub.com` in production |
| `NWS_USER_AGENT` | Weather API contact string, for example `SoldierHub/1.0 (https://soldierhub.com)` |
| `SOLDIERHUB_ADMIN_EMAILS` | Comma-separated private admin allow-list |
| `UPSTASH_REDIS_REST_URL` | Required shared production rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | Required shared production rate limiter token |
| `RATE_LIMIT_HASH_SECRET` | Required stable secret used to hash IP/user rate-limit identifiers |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | Cloudflare R2 bucket name |
| `R2_PUBLIC_URL` | Public/custom-domain base URL for uploaded images, for example `https://media.soldierhub.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional Sentry browser DSN |
| `SENTRY_DSN` | Optional Sentry server DSN |
| `SENTRY_AUTH_TOKEN` | Optional Sentry source-map upload token |

Important: the app code uses `R2_PUBLIC_URL`. Do **not** use the old `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` name for production upload config.

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel unless a server route actually needs it. The service role bypasses RLS and should not be stored without a real use case.

## Supabase setup

1. Go to Supabase dashboard → SQL Editor.
2. Apply the base schema only if the database is empty and you need the original tables/functions.
3. Apply every file in `supabase/migrations/` in filename order.
4. Skip `seed.sql` for production.
5. Run Supabase security advisors.
6. Confirm every public table has RLS enabled.
7. Confirm views exposed to the API use `security_invoker=true` or are otherwise protected.

## Supabase Auth setup

In Supabase → Authentication:

- Enable email signups only if you are ready for public signups.
- Enable email confirmation for production.
- Set Site URL to `https://soldierhub.com`.
- Add redirect URLs:

```txt
http://localhost:3000/auth/callback
https://soldierhub.com/auth/callback
https://*.vercel.app/auth/callback
```

## Admin setup

After creating your own profile, make yourself admin in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', verification_status = 'verified'
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com');
```

Set the same email in `SOLDIERHUB_ADMIN_EMAILS`, redeploy, sign out, sign back in, and verify `/admin` loads.

## Domain setup

In Vercel → Project → Settings → Domains:

1. Add `soldierhub.com`.
2. Add `www.soldierhub.com`.
3. Configure `www` to redirect to the apex domain.
4. Add DNS records from Vercel at your registrar.
5. Wait until Vercel shows valid DNS and SSL.

## Manual smoke test before launch

Test on the production Vercel URL before pointing broad traffic to the domain:

- Home page loads.
- Feed loads.
- Terms and privacy pages load.
- Sign up with a real email.
- Email confirmation redirects to `/auth/callback`.
- New user lands in pending review state.
- Admin verifies the user.
- Verified user creates a text post.
- Verified user uploads an image and creates an image post.
- Verified user comments.
- Verified user upvotes.
- Verified user reports a post.
- Admin can review/restore/remove reported content.
- Rate limited requests return a safe JSON error, not a crash.
- Logout works.

## Troubleshooting

### Build failed on Vercel

Check the build log. Most common causes are missing env vars, syntax errors, package-lock drift, or unsupported Node/dependency versions.

### Upload returns 503

Check Vercel env vars. Image upload requires all R2 variables, especially `R2_PUBLIC_URL`.

### API actions return 503 for traffic protection

Production rate limiting fails closed when Upstash/KV env vars are missing. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, then redeploy.

### Posts do not appear for new users

The user is probably still `verification_status='pending'`. Verify them from `/admin`.

### Supabase advisor warns about `SECURITY DEFINER` functions

Review `supabase/rpc-permissions.md`. Some public feed RPCs are intentionally executable by `anon`, and signed-in RPCs must enforce ownership, verification, or admin checks in the function body. Do not change grants without confirming each `.rpc()` call still works.

## Ongoing operations

When changing the database:

1. Add a new migration under `supabase/migrations/`.
2. Apply the exact SQL to live Supabase.
3. Run advisors.
4. Commit the migration.
5. Verify the app still works.

Never run destructive SQL such as `DROP`, `TRUNCATE`, or broad `DELETE` on production without a backup and a rollback plan.
