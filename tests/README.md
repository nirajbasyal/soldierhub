# Soldier Hub test layers

The fast `npm test` suite remains useful for pure functions, migration-lock
integrity, and inexpensive source contracts. It is not the security proof by
itself.

The launch gate also runs these stateful layers against a disposable local
Supabase project and a production Next.js build:

| Layer | Command | What it proves |
| --- | --- | --- |
| Fast checks | `npm test` | Sanitization, migration immutability, and source contracts |
| Auth/RLS integration | `npm run test:integration:db` | Real Auth sessions, PostgREST grants, RLS isolation, privilege-escalation defenses, anonymous identity masking |
| API integration | `npm run test:integration:api` | Auth and verification gates, moderation, persisted post/comment writes, upload signing, admin TOTP/AAL2 enforcement |
| Browser E2E | `npm run test:e2e` | Sign-in → publish → render → reply plus browser image processing and direct R2 upload |

## Local requirements

1. Docker and Supabase CLI `2.109.1`.
2. Node.js 24 and `npm ci`.
3. A local Supabase stack rebuilt from the repository migrations.
4. Chromium installed with `npx playwright install chromium`.

Never point the integration variables at production. The shared fixture helper
refuses to run unless `TEST_SUPABASE_URL` resolves to `localhost` or
`127.0.0.1`.

The GitHub Actions workflow is the canonical runnable example. It exports the
local Supabase URL/keys, supplies non-production R2 signing credentials, builds
the app, starts it on port 3000, and runs the API and browser suites.
