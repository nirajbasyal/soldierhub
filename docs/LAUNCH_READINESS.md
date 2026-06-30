# Soldier Hub Launch-Readiness Analysis for 200 Beta Users

## Context

Soldier Hub is an unofficial Fort Bliss community platform built with Next.js 16, React 19, Supabase, and Vercel. The owner is preparing to open it to roughly 200 beta users in a public-ish beta where anyone can sign up during the beta period.

This is a written launch-readiness assessment only. It does not change application code, Supabase configuration, Vercel configuration, or runtime behavior.

The requested deliverable was a single Markdown report committed to the repository. The findings below were prepared from verification against the live codebase, the live Supabase project `ibavzficwjtdbyexuzkh`, and `npm audit`, with severity calibrated for a 200-user public-ish beta.

## Bottom line

The app is substantially launch-hardened and close to ready for a 200-user beta. Architecture, RLS posture, auth/admin authorization, rate limiting, input validation, and legal pages are in good shape. There are no architectural blockers identified for a controlled 200-user beta.

For a public-ish beta, the gating items are mostly operational and content-moderation related rather than core architecture defects:

1. Automated moderation is thin and local-keyword-only.
2. `npm audit` reports 9 vulnerabilities, including 2 high-severity advisories with fixes available.
3. Production environment variables must be confirmed in Vercel because the production rate limiter fails closed; missing Upstash variables can make write actions return `503`.

## Launch recommendation

**Recommendation: conditional go for a 200-user beta after the must-do checklist is complete.**

Do not open broad public signups until these items are handled:

- Patch dependency advisories and re-run CI.
- Confirm all required production environment variables in Vercel.
- Add stronger moderation coverage at the existing moderation seam, or run the beta with very active manual moderation and a smaller trusted-user rollout first.

## What is solid

### Database security and RLS

- RLS is enabled on all 15 public tables.
- Anonymous-post privacy is enforced at the database layer, not only in the UI.
- The `posts` table has no direct public SELECT policy that exposes anonymous author identity.
- The `posts_with_meta` view returns `null` for anonymous author IDs.
- A trigger blanks cached author fields for anonymous posts.

### Rate limiting

- Production rate limiting fails closed.
- `src/lib/server/rateLimit.js` returns `503` in production when Upstash is not configured instead of falling back to unsafe in-memory limiting.
- On Upstash errors in production, the limiter also returns `503`.
- The rate limiter uses per-IP and per-user controls.
- Identifiers are hashed before storage.

### Admin authorization

- Admin authorization is layered.
- Admin API routes require a bearer token.
- Admin API routes require `role = 'admin'`.
- Admin access also checks `SOLDIERHUB_ADMIN_EMAILS`.
- MFA level `aal2` is required for admin APIs.
- `src/proxy.js` also guards `/admin` at the edge.

### Write-route validation

The post-create route is well defended. `src/app/api/posts/create/route.js` includes:

- IP rate limiting.
- User rate limiting.
- Authentication checks.
- JSON validation.
- Category allowlist validation.
- Body length validation.
- Image ownership validation through `isUserPostImageKey` and expected public URL checks.
- Content-safety checks.
- A live `verification_status === 'verified'` check before insert.

### Profile privilege protection

- Profile privilege fields are protected.
- The `protect_profile_sensitive_fields` trigger blocks users from self-setting privileged fields such as `role` and `verification_status`.

### Database maturity

- The database has a mature migration history with 58 migrations.
- SECURITY DEFINER functions have locked `search_path` via `20260610002000_lock_security_definer_search_path.sql`.
- RPC grants are intentionally allow-listed and documented in `supabase/rpc-permissions.md` and the hardening allowlist migration.

### Legal and SEO readiness

- `/terms` and `/privacy` are thorough enough for beta launch.
- Legal pages include personal-capacity and not-affiliated-with-DoD disclaimers.
- OPSEC prohibitions are covered.
- Data retention language is present.
- `robots.js` blocks `/admin`, `/api`, and `/auth`.
- `sitemap.js` is dynamic.

### Operational basics

- Security headers and CSP are present in `next.config.mjs`.
- Sentry is wired for client, server, and edge.
- CI uses lint and build checks.
- Main has been green on prelaunch CI.
- Global and route error boundaries exist.
- Demo-mode degradation is graceful.

## Severity-ranked findings

| Severity | Finding | Risk | Recommendation |
|---|---|---|---|
| Must-do | Automated moderation is local-keyword-only | Highest public-beta exposure. Open signups can bring profanity, harassment, spam, unsafe content, or OPSEC issues that the current local list may miss. | Re-wire an external classifier at the existing `checkContentSafety` seam, or substantially expand the local lexicon. Confirm report-to-admin workflow speed before launch. |
| Must-do | `npm audit` reports 9 vulnerabilities, including 2 high-severity advisories | Includes advisories relevant to `ws` and Next.js middleware/proxy or RSC behavior. Middleware/proxy advisories matter because `/admin` is guarded by middleware/proxy logic. | Run `npm audit fix`, rebuild, and re-run CI. Confirm the lockfile remains consistent. |
| Must-do | Production environment variables need final Vercel confirmation | Missing Upstash variables will cause write actions to fail closed with `503`. Missing R2 variables can break media upload. | Confirm all required env vars in Vercel before opening signups. |
| Strongly recommended | Supabase leaked-password protection is off | Public signups benefit from leaked-password checks. | Enable leaked-password protection in Supabase Auth settings. |
| Strongly recommended | Load test should run at the actual beta size | Existing load test defaults are below the planned 200 users and mostly exercise read paths. | Run `USERS=200 DURATION_SECONDS=300` against production and add at least one authenticated write path. |
| Strongly recommended | Seed real content before users arrive | Empty feed/resources reduce trust and first impression. Live DB is near-empty. | Add launch-ready posts, resources, gate/help content before inviting users. |
| Should-do | No unit/integration test suite | CI is lint and build only. Security-critical behavior is not automatically regression-tested. | Add a small smoke suite: unverified user cannot post, non-admin cannot hit admin APIs, anonymous posts hide author. |
| Should-do | Resources entry is disabled as “Soon” in mobile menu | `/resources` appears implemented but hidden in the mobile menu. | Confirm whether hiding resources is intentional for beta. |
| Low | Admin email check includes profile email fields | Role is trigger-protected, so escalation is not realistically available through email alone. | Optional cleanup: prefer immutable auth email only. |
| Low | Revoked users can keep read sessions until token expiry | Writes re-check status live, so the high-risk path is mitigated. | Accept for beta; consider shorter session behavior later. |
| Low | Sentry edge config hardcodes DSN while server uses env var | DSNs are not secrets, but consistency is cleaner. | Optional cleanup. |
| Low | CSP allows `unsafe-inline` and `unsafe-eval` | Common with some analytics/Sentry setups, but weaker than nonce-based CSP. | Future hardening, not a 200-user beta blocker. |
| Informational | Supabase unused-index INFOs | Expected before real traffic because indexes may be ready for queries that have not run often yet. | Leave them for now and review after beta traffic. |
| Informational | SECURITY DEFINER functions executable by anon/authenticated | Intentional and documented via RPC allowlist. | Keep the allowlist as the review record. |

## Must-do before opening signups

### 1. Strengthen automated moderation

Current moderation is too thin for open signups. `src/lib/server/contentSafety.js` relies on a small local keyword list with basic normalization. It does not provide broad coverage for profanity, slurs, harassment, spam, link abuse, self-harm risk, or OPSEC-sensitive submissions.

The highest-risk part is that every allowed post is stamped as degraded, so `moderation_status = 'degraded'` cannot meaningfully separate safe posts from risky posts. For public-ish signups, this should be improved before launch.

Recommended options:

- Re-wire an external moderation classifier at the existing `checkContentSafety` seam.
- Or materially expand the local lexicon and add stronger spam/link/harassment checks.
- Confirm admin review and report response time before launch.
- For the first 200 users, monitor reports aggressively.

### 2. Patch npm audit vulnerabilities

`npm audit` reports 9 vulnerabilities, including 2 high-severity findings. Fixes are available within the current dependency range.

Recommended action:

```bash
npm audit fix
npm install
npm run lint
npm run build
```

Then commit the lockfile update and confirm CI is green.

### 3. Confirm Vercel production environment variables

This must be checked directly in Vercel before launch. Because production rate limiting fails closed, missing Upstash variables can make all write routes fail.

Required production variables to confirm:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
SOLDIERHUB_ADMIN_EMAILS
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_HASH_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
SENTRY_DSN / related Sentry variables as used by the app
```

Notes:

- `RATE_LIMIT_HASH_SECRET` should be stable and should not use a hardcoded fallback in production.
- R2 variables must match the current code and deployment documentation.
- If service-role env vars are not required for production admin flows, do not set them unnecessarily.

## Strongly recommended before or during launch

### 1. Enable Supabase leaked-password protection

Supabase Auth leaked-password protection is currently a security advisor warning. This is especially useful for open signups.

Recommended action:

- Go to Supabase Auth settings.
- Enable leaked-password protection.
- Save settings.
- Run a quick signup/login smoke test.

### 2. Run a 200-user load test

The existing load test defaults to 25 users and mostly exercises read paths.

Recommended command shape:

```bash
USERS=200 DURATION_SECONDS=300 BASE_URL=https://www.soldierhub.com node tests/load/soldierhub-load-test.mjs
```

Also add at least one authenticated write-path test so rate-limit behavior is observed under load.

### 3. Seed real launch content

Current content is very light:

- Resources: roughly 1 row.
- Gates: roughly 3 rows.
- Posts: roughly 3 rows.

For a public beta, first impression matters. Seed content before launch:

- Welcome post.
- OPSEC reminder post.
- How to use Soldier Hub post.
- Board Prep announcement.
- Fort Bliss resources.
- Frequently asked local questions.
- Gate and BAH tool explanation.

## Should-do but not blocking

### 1. Add minimal security smoke tests

The highest-value test coverage would be small but security-focused:

- Unverified users cannot create posts.
- Non-admin users cannot access `/api/admin/*`.
- Anonymous posts do not expose author identity.
- Revoked users cannot write.
- Post image ownership checks reject non-owned URLs.

### 2. Confirm Resources launch visibility

The Resources feature appears implemented, but the mobile menu marks it as disabled or “Soon.” Confirm whether that is intentional.

For beta, hiding incomplete sections is acceptable. If Resources is ready, enable the entry and seed useful links.

## Low-priority and informational notes

### Admin email check

The admin email allowlist currently trusts profile email fields as well as auth email. Because the admin role is trigger-protected and cannot be self-set by normal users, this is not a practical escalation path in the current design.

Cleaner future version:

- Prefer immutable `auth.email` for the allowlist check.

### Revoked users

Writes re-check `verification_status` live, which is the important protection. Read sessions can persist until token expiry, which is acceptable for beta.

### Sentry DSN consistency

Sentry edge config hardcodes its DSN while server config uses an environment variable. DSNs are not secrets, but using environment variables everywhere would be cleaner.

### CSP hardening

The CSP includes `unsafe-inline` and `unsafe-eval`, which is common in apps using certain analytics or monitoring tools. It is not a 200-user beta blocker. Future hardening can move toward nonce-based CSP.

### Supabase unused-index advisors

Unused-index INFO findings are expected before real traffic. Do not remove launch indexes before the beta. Review actual index usage after real user traffic exists.

### SECURITY DEFINER warnings

The security advisor warnings about SECURITY DEFINER functions executable by anon/authenticated are intentional and documented. The RPC permission allowlist should remain the review record.

## Go / no-go checklist

### Go only if all must-do items are complete

- [ ] `npm audit fix` completed.
- [ ] `npm audit` has no high-severity findings or remaining findings are explicitly accepted.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] GitHub CI is green.
- [ ] Vercel production env vars are confirmed.
- [ ] Upstash rate limit variables are present.
- [ ] R2 upload variables are present.
- [ ] Admin emails env var is correct.
- [ ] Supabase Auth leaked-password protection decision is made.
- [ ] Moderation strategy for beta is improved or active manual moderation coverage is confirmed.
- [ ] Manual smoke test from `DEPLOYMENT.md` passes against production.

### Recommended before inviting the full 200 users

- [ ] Run a 200-user load test.
- [ ] Seed welcome and resource content.
- [ ] Confirm report-to-admin flow works.
- [ ] Confirm admin can remove or restore reported posts.
- [ ] Confirm unverified users cannot post.
- [ ] Confirm public Board Prep study works without login.
- [ ] Confirm logged-in Board Prep daily/streak flow works.
- [ ] Confirm sign up, email confirmation, pending review, approval, login, post, comment, upvote, report, and logout flows.

## Calibration notes

The following claims were checked and corrected during analysis:

| Claim | Calibration |
|---|---|
| “Rate limiter fails open in production.” | False. It fails closed with `503`. |
| “Admin email allowlist creates critical privilege escalation.” | Rejected. The `role = 'admin'` gate is trigger-protected, so email match alone grants nothing. |
| “Service-role key is a critical production risk.” | Overstated. It is optional and documented. Confirm it is not set unless needed. |
| “Revoked users keep full access.” | Overstated. Writes re-check live status. Read sessions may persist until token expiry. |
| “SECURITY DEFINER warnings are blockers.” | Rejected. They are intentional and documented via RPC allowlist. |
| “Unused indexes should be removed before launch.” | Rejected. They should remain through beta and be reviewed after real traffic. |

## Verification guide

Use these checks to re-confirm the report before launch:

### Supabase security posture

- Run Supabase security advisors.
- Confirm there are no ERROR-level advisor findings.
- Confirm all public tables still have RLS enabled.
- Confirm intentional SECURITY DEFINER warnings match `supabase/rpc-permissions.md`.

### Dependency posture

```bash
npm audit
npm audit fix
npm run lint
npm run build
```

### Rate limiter behavior

Review `src/lib/server/rateLimit.js` production paths and confirm:

- Missing Upstash config returns `503` in production.
- Upstash error returns `503` in production.
- Per-user and per-IP limits are both active for write routes.

### Moderation behavior

Review `src/lib/server/contentSafety.js` and confirm:

- Threat, profanity, spam, harassment, and OPSEC coverage is acceptable for public-ish signups.
- `degraded` status has meaningful operational value or is documented as a fallback state.
- Admin report/review workflow is ready.

### Manual production smoke test

Follow the checklist in `DEPLOYMENT.md` against the production Vercel URL before inviting the full beta group.

## Final assessment

Soldier Hub is close to ready for a 200-user beta. The core platform is far stronger than a typical MVP: RLS is in place, write routes are validated, admin access is layered, rate limiting is production-aware, and the database design has meaningful hardening.

The remaining launch risk is not basic architecture. The remaining launch risk is operational readiness for public-ish signups: moderation, dependency patching, environment confirmation, and first-impression content.

Once those must-do items are complete, the app is reasonable to open to roughly 200 beta users with active monitoring and fast admin response.
