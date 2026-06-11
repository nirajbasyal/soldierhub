# Soldier Hub — Complete Codebase Analysis

**Date:** 2026-06-08
**Scope:** Security & Privacy, Code Quality & Bugs, Architecture, Performance
**Method:** Static analysis only (no code executed, no load test run). Citations use `path:line`.

---

## 1. Executive Summary

Soldier Hub is a security-mature MVP. The backend (Supabase RLS, API authorization, input
validation, content sanitization, security headers) is well above the bar for a community
platform of this size — the security review surfaced only one low-severity item. The debt
is concentrated on the **frontend rendering model** and the **database indexing strategy**,
both of which are fine at current scale but will degrade as users and content grow.

The two highest-leverage issues are: (1) a **monolithic React context with zero component
memoization**, causing the entire consumer tree to re-render on any state change; and
(2) **missing indexes** on several frequently-filtered columns (`posts.author_id`,
`comments.post_id`, and `user_id`-only lookups on `upvotes`/`reports`).

| Pillar | High | Medium | Low | Verdict |
|---|---|---|---|---|
| Security & Privacy | 0 | 0 | 1 | Strong |
| Code Quality & Bugs | 0 | 2 | 4 | Good |
| Architecture | 1 | 2 | 0 | Solid foundation, scaling debt |
| Performance | 2 | 4 | 0 | Needs attention before growth |

---

## 2. Methodology & Scope

Reviewed areas:

- `src/app/**` — pages and API routes
- `src/components/**` — React components
- `src/store/**` — `AppContext` and action hooks
- `src/lib/**` — data layer, auth, server utilities
- `supabase/migrations/**` — schema, RLS policies, indexes
- `next.config.mjs`, `package.json`

This is a static review. Runtime profiling, `EXPLAIN ANALYZE` on production data, and the
existing load test (`tests/load/soldierhub-load-test.mjs`) were **not** run; performance
findings are derived from code and schema inspection and should be confirmed with profiling
where noted.

Each finding is formatted as: **Title · Severity · Location · What's wrong · Why it matters.**

---

## 3. Security & Privacy

**Overall: Strong.** Defense-in-depth across application and database layers.

### Controls verified (positive)

- **Consistent server-side authorization.** Admin/privileged API routes extract a bearer
  token, validate it with Supabase, then re-check role/verification against the database —
  not client-supplied claims. See `src/lib/server/adminAuth.js:44` (`requireAdmin` validates
  `role === "admin"` *and* email membership in `SOLDIERHUB_ADMIN_EMAILS`).
- **No service-role key exposure.** No `service_role` / `SUPABASE_SERVICE_ROLE` usage found in
  client code or under `src/app/api`. Public env vars are limited to the intentionally-public
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` and non-sensitive values.
- **Row Level Security on every table**, consolidated for correctness and performance — e.g.
  `supabase/migrations/20260606220000_consolidate_profiles_reports_rls_policies.sql` and
  `supabase/migrations/20260606214500_consolidate_posts_comments_rls_policies.sql`.
- **True anonymity for anonymous posts.** Author identity is blanked at the database/view
  layer (not just hidden in the UI), with cached display fields (`author_name_cached`,
  `author_color_cached`) so the real `author_id` is not leaked through the feed or
  notifications.
- **HTML sanitization before render.** Rich text is whitelisted via `DOMParser` (allowed tags
  only, attributes stripped except validated `href`) before any `dangerouslySetInnerHTML`:
  `src/components/ui/ExpandableText.jsx:152` and
  `src/components/feed/composer/composerUtils.js:74`.
- **Strong transport/headers.** CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy`, locked-down `Permissions-Policy`, and
  `upgrade-insecure-requests` in production — `next.config.mjs:5-61`.
- **Input validation & abuse controls.** Length caps on posts/comments/resources, content
  moderation (`checkContentSafety`), per-IP and per-user rate limiting, and image-upload
  type/size validation in `src/app/api/media/r2-upload/route.js`.
- **Parameterized queries throughout** (Supabase SDK / RPC) — no string-concatenated SQL.

### Findings

**[LOW] CSP permits `unsafe-inline` and `unsafe-eval`**
- **Location:** `next.config.mjs` (`script-src` directive, ~lines 14–18)
- **What:** The `script-src` directive includes both `'unsafe-inline'` and `'unsafe-eval'`,
  required by the Sentry integration.
- **Why it matters:** These directives reduce the CSP's effectiveness against script
  injection. Risk is low given the strong sanitization elsewhere, but it is the weakest link
  in an otherwise tight policy. Consider a nonce-based CSP or Sentry's CSP-friendly init to
  drop at least `unsafe-eval`.

---

## 4. Code Quality & Bugs

**Overall: Good.** Clean data-layer separation and consistent API patterns. The issues below
are mostly silent-failure and maintainability concerns rather than correctness-breaking bugs.

**[MED] Stale `useEffect` in admin board-prep manager**
- **Location:** `src/components/admin/BoardPrepManager.jsx:235`
- **What:** `useEffect(() => { load(); }, [])` runs `load()` once, but `load` closes over
  `query` and `requestStatus` which are not in the dependency array.
- **Why it matters:** Changing the search/filter does not trigger a reload — the admin sees
  stale results until something else forces a re-fetch. Either add the dependencies or move
  the filter values into the query the effect depends on.

**[MED] Silent failures with no user feedback**
- **Location:** `src/store/hooks/useNotificationActions.js:35` (`markAllNotificationsRead`),
  `src/store/hooks/usePostActions.js:297` (`refreshCommentsInBackground`)
- **What:** On error these paths return / swallow without surfacing a toast. Local state
  (e.g. notifications marked read) can diverge from the server.
- **Why it matters:** Users believe an action succeeded when it didn't; the divergence is
  invisible until a reload. At minimum, log to Sentry and surface a non-blocking toast on the
  user-initiated path (`markAllNotificationsRead`). The background comment refresh swallowing
  is intentional (must not block UI) but should still report to Sentry.

**[LOW-MED] Unhandled rejection in realtime notification hydration**
- **Location:** `src/store/hooks/useDataLoader.js:534`
- **What:** `NotificationsDB.hydrateNotificationRows([notification]).then(...)` has no
  `.catch()`.
- **Why it matters:** A failed hydration becomes an unhandled promise rejection inside an
  effect; the notification silently fails to update. Add a `.catch()` that falls back to the
  raw notification row.

**[LOW-MED] Duplicated helper functions**
- **Location:** `getAuthorId()` is redefined in `src/app/page.jsx:45`,
  `src/app/profile/[id]/page.jsx:23`, `src/components/feed/PostCard.jsx:43`,
  `src/store/hooks/useProfileActions.js:40`; `getCommentAuthorId()` is duplicated in
  `src/store/hooks/usePostActions.js:130` and `src/lib/db/comments.js:16`.
- **Why it matters:** Divergent copies drift over time and make the anonymous-author logic
  (security-relevant) harder to reason about. Extract to a single shared util (e.g.
  `src/lib/helpers.js`).

**[LOW] Weak React `key` fallback**
- **Location:** `src/components/feed/PostCard.jsx:881`
- **What:** Comment keys fall back to `` `${postId}-${item.created_at}-${item.body}` `` when no
  id is present.
- **Why it matters:** Two comments with identical timestamp + body would collide, causing
  React reconciliation glitches. Prefer a guaranteed-unique id; the fallback should be a last
  resort only.

**[LOW] Leftover `console.error` / `console.warn` in production paths**
- **Location:** ~19 sites across API routes and components, e.g.
  `src/app/api/profiles/follow/route.js:110`, `src/app/api/posts/upvote/route.js:55`,
  `src/components/admin/AdminVerifyByEmail.jsx:69`.
- **Why it matters:** Unstructured logging that won't reach Sentry and clutters the browser
  console. Route errors through the existing Sentry integration / a small logging helper.

---

## 5. Architecture

**Overall: Solid foundation with frontend scaling debt.** The data layer is genuinely good;
the state-management layer is the weak point.

**[HIGH] Monolithic `AppContext`**
- **Location:** `src/store/AppContext.jsx:241-357`
- **What:** A single context exposes ~80 properties plus spread action-hook namespaces
  (`...postActions`, `...profileActions`, etc.) with a very large `useMemo` dependency array.
- **Why it matters:** Any state change (even unrelated UI like toggling the mobile menu)
  produces a new context value, re-rendering every consumer. This is the root cause of the
  performance issues in §6. Recommend splitting into domain providers
  (`AuthProvider` / `FeedProvider` / `NotificationProvider`) so consumers subscribe only to
  what they use.

**[MED] Fully client-rendered app / leaky RSC split**
- **Location:** `src/app/layout.jsx`
- **What:** The root layout (an RSC) immediately wraps the tree in the `"use client"`
  `AppProvider`, so effectively the whole app is client-rendered. Server rendering is used
  only for the OG/Twitter image routes.
- **Why it matters:** Forfeits Next.js SSR/streaming benefits (slower first paint, full
  hydration cost). Not urgent, but worth revisiting if first-load metrics matter.

**[MED] Oversized `useDataLoader`**
- **Location:** `src/store/hooks/useDataLoader.js` (~559 lines)
- **What:** One hook handles auth bootstrap, post loading, notifications, admin data, caching,
  and realtime subscriptions.
- **Why it matters:** Hard to test and reason about; couples unrelated concerns. Decompose
  alongside the context split.

**Positive — clean data layer.** `src/lib/db/**` cleanly abstracts Supabase access, batches
to avoid N+1 (e.g. `get_public_comments_for_posts`, added in
`supabase/migrations/202605170002_add_batched_comments_rpc.sql`), uses keyset/cursor
pagination, and degrades gracefully with profile-hydration fallbacks.

---

## 6. Performance

**[HIGH] No component memoization**
- **Location:** project-wide; notably `src/components/feed/PostCard.jsx` and its inline
  subcomponents (e.g. `CommentRow` ~`:355`).
- **What:** No `React.memo` anywhere in the codebase; `PostCard` and its children are plain
  function components.
- **Why it matters:** Combined with the monolithic context (§5), every `PostCard` and comment
  re-renders on any app state change even when the underlying data is unchanged. With 30 feed
  posts this means hundreds of needless renders per interaction. Wrap stable list rows in
  `React.memo` and stabilize the callbacks passed to them (see next item).

**[HIGH] Missing database indexes (verified against baseline schema)**
- **Location:** `supabase/migrations/20260501000000_step01_baseline_core_schema.sql`
- **What:** Several hot filter columns are unindexed:
  - `posts(author_id)` — no index. Used by the profile "my posts" query (`listMyPosts`).
  - `comments(post_id)` — no index (only `comments_deleted_by_idx` exists on the table). Used
    by batched comment loads filtering `post_id = ANY(...)`.
  - `upvotes` and `reports` use a composite primary key `(post_id, user_id)`. Queries that
    filter by `user_id` **alone** (`listMyUpvotedPostIds`, `listMyReportedPostIds`) cannot use
    the composite PK because `user_id` is not its leading column.
- **Why it matters:** These become sequential scans as data grows. Note: **PostgreSQL does
  not automatically create indexes on foreign-key columns** — only on primary keys and unique
  constraints — so the FK declarations here do not cover these access patterns. Add:
  `posts(author_id, created_at desc)`, `comments(post_id) where deleted_at is null`,
  `upvotes(user_id)`, `reports(user_id)`.

**[MED] Dead real-time feed subscription**
- **Location:** `src/lib/db/realtime.js:13` (`subscribeToPosts`)
- **What:** `subscribeToPosts()` is defined but **never called** anywhere in the app
  (verified by grep — only the definition exists).
- **Why it matters:** New posts do not appear in real time; users must refresh or paginate.
  Either wire it up in `useDataLoader` or remove it as dead code.

**[MED] No code splitting / heavy dependencies on every page**
- **Location:** `package.json`; `TipTapComposerEditor.jsx`
- **What:** TipTap (full WYSIWYG editor), the AWS SDK (R2 presigning), and Sentry are imported
  at module level. No `next/dynamic` / `React.lazy` usage was found.
- **Why it matters:** Feed visitors download composer/editor code they never use. Lazy-load
  the composer with `next/dynamic` (`{ ssr: false }`) and confirm the AWS SDK is only pulled
  into server bundles.

**[MED] Realtime notification hydration fans out per event**
- **Location:** `src/store/hooks/useDataLoader.js:534`
- **What:** Each incoming realtime notification triggers a `hydrateNotificationRows` DB fetch.
- **Why it matters:** Bursty activity (e.g. many upvotes) produces one DB round-trip per
  event. Prefer hydrating from the trigger payload, or batch/debounce hydration.

**[MED] Feed comments not paginated or virtualized**
- **Location:** `src/lib/db/comments.js` (`DEFAULT_COMMENT_LIMIT = 50`),
  `src/components/feed/PostCard.jsx`
- **What:** Up to 50 comments per post are hydrated and rendered without virtualization or
  "load more".
- **Why it matters:** A busy feed can mount hundreds of comment nodes at once, inflating DOM
  size and render cost. Show a few comments with a "load more", and/or virtualize long lists.

---

## 7. Prioritized Recommendations

**Phase 1 — Quick wins (low risk, high payoff)**
1. Wrap `PostCard` (and comment rows) in `React.memo` and stabilize the callbacks passed down.
2. Wire up `subscribeToPosts()` in `useDataLoader` — or delete it if real-time feed isn't wanted.
3. Fix the `BoardPrepManager` effect dependencies so filters reload.
4. Lazy-load `TipTapComposerEditor` via `next/dynamic`.

**Phase 2 — Database**
1. Add indexes: `posts(author_id, created_at desc)`, `comments(post_id) where deleted_at is null`,
   `upvotes(user_id)`, `reports(user_id)`.
2. Run `EXPLAIN ANALYZE` on `get_public_posts` and the search RPCs against production-like data
   to confirm index usage and catch any remaining seq scans.

**Phase 3 — Architecture**
1. Split `AppContext` into domain providers (Auth / Feed / Notifications).
2. Decompose `useDataLoader` along the same boundaries.
3. Add user-visible feedback (toast + Sentry) on the silent-failure paths.

**Phase 4 — Hardening & cleanup**
1. Tighten CSP toward nonces; drop `unsafe-eval` if Sentry config allows.
2. Route stray `console.*` calls through Sentry / a logging helper.
3. Deduplicate `getAuthorId` / `getCommentAuthorId` into a shared util.

---

## 8. Appendix — Finding Index

| # | Pillar | Severity | Finding | Location |
|---|---|---|---|---|
| 1 | Security | LOW | CSP allows `unsafe-inline`/`unsafe-eval` | `next.config.mjs:14-18` |
| 2 | Quality | MED | Stale `useEffect` (filters don't reload) | `src/components/admin/BoardPrepManager.jsx:235` |
| 3 | Quality | MED | Silent failure, no feedback | `src/store/hooks/useNotificationActions.js:35` |
| 4 | Quality | MED | Swallowed background error | `src/store/hooks/usePostActions.js:297` |
| 5 | Quality | LOW-MED | Unhandled promise rejection | `src/store/hooks/useDataLoader.js:534` |
| 6 | Quality | LOW-MED | Duplicated `getAuthorId`/`getCommentAuthorId` | `page.jsx:45`, `profile/[id]/page.jsx:23`, `PostCard.jsx:43`, `useProfileActions.js:40` |
| 7 | Quality | LOW | Weak React `key` fallback | `src/components/feed/PostCard.jsx:881` |
| 8 | Quality | LOW | Leftover `console.*` (~19 sites) | e.g. `api/profiles/follow/route.js:110` |
| 9 | Architecture | HIGH | Monolithic `AppContext` | `src/store/AppContext.jsx:241-357` |
| 10 | Architecture | MED | Fully client-rendered / leaky RSC split | `src/app/layout.jsx` |
| 11 | Architecture | MED | Oversized `useDataLoader` | `src/store/hooks/useDataLoader.js` |
| 12 | Performance | HIGH | No component memoization | `src/components/feed/PostCard.jsx` (project-wide) |
| 13 | Performance | HIGH | Missing indexes (`posts.author_id`, `comments.post_id`, `upvotes/reports` by `user_id`) | `supabase/migrations/20260501000000_step01_baseline_core_schema.sql` |
| 14 | Performance | MED | Dead `subscribeToPosts` (no real-time feed) | `src/lib/db/realtime.js:13` |
| 15 | Performance | MED | No code splitting / heavy module-level deps | `package.json`, `TipTapComposerEditor.jsx` |
| 16 | Performance | MED | Per-event realtime hydration fan-out | `src/store/hooks/useDataLoader.js:534` |
| 17 | Performance | MED | Feed comments not paginated/virtualized | `src/lib/db/comments.js`, `PostCard.jsx` |
