# Soldier Hub

An unofficial Fort Bliss community platform for housing tips, gate updates, PCS advice, warnings, and resources — by and for verified soldiers and families.

> **Soldier Hub is unofficial. Not affiliated with the Department of War.**

---

## Two ways to run

### 1. Local mode (no setup, runs in 2 minutes)

No database, no auth provider, no env vars. The app starts empty — sign up with the local demo admin email through the UI to get going.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- Click **Create account** with email `admin@soldierhub.local` (or set `NEXT_PUBLIC_SOLDIERHUB_DEMO_ADMIN_EMAIL` for a different local-only demo admin).
- This demo email is auto-promoted to admin and verified only when the app is running without Supabase.
- Other emails go to a pending queue — sign in as admin and verify them from the admin dashboard.

This local mode is for previewing the UI. It's not persistent: refresh the page and your data is gone. Move to live mode for anything real.

### 2. Live mode (production with Supabase)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full step-by-step instructions to deploy to soldierhub.com.

---

## Project structure

```
src/
├── app/                          Next.js App Router routes
│   ├── layout.jsx                Root layout + SEO metadata
│   ├── providers.jsx             Wraps app in AppContext
│   ├── globals.css               Tailwind + fonts + animations
│   ├── page.jsx                  /            home / feed
│   ├── resources/page.jsx        /resources   curated Fort Bliss links
│   ├── profile/page.jsx          /profile     user's own profile + posts
│   ├── notifications/page.jsx    /notifications
│   ├── admin/page.jsx            /admin       admin dashboard
│   ├── pending-review/page.jsx   /pending-review
│   ├── tools/bah/page.jsx        /tools/bah
│   ├── tools/gates/page.jsx      /tools/gates
│   ├── auth/callback/route.js    POST /auth/callback (email confirmation)
│   ├── api/moderate/route.js     POST /api/moderate
│   ├── sitemap.js                /sitemap.xml
│   ├── robots.js                 /robots.txt
│   └── global-error.jsx          Top-level error boundary
│
├── components/                   Each component in its own file
│   ├── layout/                   TopNav, BottomNav, MobileMenu, AppShell, Footer, ScrollToTop
│   ├── ui/                       Avatar, Badge, Button, Modal, ConfirmDialog, ToastHost, PostSkeleton, …
│   ├── feed/                     FeedHero, PostCard, PostComposer, CategoryStrip
│   ├── auth/                     AuthModal
│   ├── profile/                  ProfileHeader, UserPostList, EditPostModal
│   ├── admin/                    PendingUsersList, ReportedPostsList, MembersList
│   ├── notifications/            NotificationItem
│   ├── resources/                ResourceCard
│   └── tools/                    WeatherCard, MobileWeatherStrip, BAHCard, GateHoursCard
│
├── store/
│   └── AppContext.jsx            Single source of truth — Supabase + demo dual mode
│
├── lib/
│   ├── theme.js                  Color tokens (change to reskin everything)
│   ├── constants.js              Categories, gates, BAH rates, demo admin email
│   ├── helpers.js                uid, timeAgo, getInitials, shareOrCopy, …
│   ├── moderation.js             Local content filter rules
│   ├── seed.js                   Demo-mode users + posts
│   ├── resources.js              Resources page data
│   ├── supabase/
│   │   ├── client.js             Browser-side client
│   │   ├── server.js             Server-side client (cookies)
│   │   ├── middleware.js         Session refresh helper
│   │   └── auth.js               signUp, signIn, signOut, getCurrentUser
│   ├── db/
│   │   ├── profiles.js           Profile queries + admin verify/reject
│   │   ├── posts.js              Posts, upvotes, reports
│   │   ├── comments.js           Comment queries
│   │   ├── notifications.js      Notifications + mark-read
│   │   └── realtime.js           Live subscriptions
│   └── storage/                  (placeholder for future image uploads)
│
└── proxy.js                      Refresh session, guard /admin (Next.js 16 — formerly middleware.js)

supabase/
├── schema.sql                    Tables, indexes, triggers, views
├── policies.sql                  Row Level Security rules
└── seed.sql                      Optional dev seed
```

## Where do I edit X?

| You want to change…                     | Edit this file                                  |
| --------------------------------------- | ----------------------------------------------- |
| Colors / brand                          | `src/lib/theme.js`                              |
| Categories                              | `src/lib/constants.js` → `CATEGORIES`           |
| Fort Bliss gate hours                   | `src/lib/constants.js` → `GATES`                |
| BAH reference rates                     | `src/lib/constants.js` → `BAH_RATES`            |
| Local demo admin email                  | `NEXT_PUBLIC_SOLDIERHUB_DEMO_ADMIN_EMAIL` or `src/lib/constants.js` fallback |
| Resources page links                    | `src/lib/resources.js`                          |
| Seed data shape (kept empty for fresh launch) | `src/lib/seed.js`                       |
| Banned phrases                          | `src/lib/moderation.js`                         |
| Bottom nav tabs                         | `src/components/layout/BottomNav.jsx`           |
| Mobile menu drawer                      | `src/components/layout/MobileMenu.jsx`          |
| Top nav links                           | `src/components/layout/TopNav.jsx`              |
| Auth flow / signup form                 | `src/components/auth/AuthModal.jsx`             |
| Post card layout                        | `src/components/feed/PostCard.jsx`              |
| Hero copy on the feed                   | `src/components/feed/FeedHero.jsx`              |
| Footer disclaimer                       | `src/components/layout/Footer.jsx`              |
| Database schema                         | `supabase/schema.sql`                           |
| Row Level Security policies             | `supabase/policies.sql`                         |
| Site metadata / SEO                     | `src/app/layout.jsx`                            |

## Adding a page

1. Create `src/app/your-route/page.jsx`.
2. Mark it `"use client"` if it consumes context.
3. Wrap in `<AppShell>` (or `<AppShell hideNav>` for full-screen pages).
4. Add a `<MenuItem>` entry in `MobileMenu.jsx` if it should appear in the drawer.

## Admin configuration

- **Local/demo mode:** the browser-only demo store auto-promotes `NEXT_PUBLIC_SOLDIERHUB_DEMO_ADMIN_EMAIL`, falling back to `admin@soldierhub.local`, so you can preview admin flows without a database.
- **Live/Supabase mode:** do not rely on the public demo admin email. Promote admins in Supabase and set private `SOLDIERHUB_ADMIN_EMAILS` on the server so protected admin API routes can verify both role and expected email.

## Why two modes?

The app runs in **local mode** without any backend — useful for previewing UI changes and showing designs to others before launch. Without Supabase env vars, it starts empty and forgets data on refresh.

When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, the app automatically switches to **live mode** — real auth, real database, real-time updates. Components don't know which mode is active; the switch happens inside `AppContext`.

## Production moderation

The local rule-based filter in `src/lib/moderation.js` runs on every post. To add AI-powered moderation, set `MODERATION_API_KEY` (OpenAI key) in your environment and the moderation API will also call the OpenAI Moderation endpoint.

## Security & privacy model

A few things that matter for a community app — already wired into this codebase:

- **Row Level Security on every table.** Anonymous users can browse posts and comments; content writes go through authenticated server routes; only post authors can edit, only post authors/admins can delete, and only admins see pending users and reports.
- **`profiles` table is private.** Only the user themselves and admins can read profile rows (which contain emails). Public components use the `public_profiles` view (only id, name, bio, avatar) or denormalized cached fields on posts/comments.
- **Anonymous posts are anonymous at the API level, not just visually.** When a user posts anonymously, the database trigger blanks the cached author fields. The public `posts_with_meta` view returns `null` for `author_id` on anonymous posts. The underlying `posts` table has **no public SELECT policy** — only authors (own rows), admins, and the view itself can read it. So a snooper cannot bypass the view by querying `posts` directly. Even with browser dev tools, no one can see who wrote an anonymous post — except the author themselves and admins.
- **Authors cannot bypass moderation via direct Data API calls.** Browser roles cannot insert or update post/comment content, and the legacy comment writer RPC is server-only. The server routes verify the JWT and profile, apply rate limits, validate media ownership, run moderation, and then write with a server-only credential.
- **`security_invoker = true`** on `posts_with_meta` and `my_posts_with_meta` — prevents the views from bypassing RLS on the underlying tables.
- **No service role key in the browser.** `SUPABASE_SERVICE_ROLE_KEY` is required by protected server routes, but it is never prefixed with `NEXT_PUBLIC_` or imported by Client Components. Browser-held Supabase credentials cannot write moderated content directly.
- **Admin "remove member" is a soft disable** (sets `verification_status='rejected'`). The auth account stays, but they can't post. Reversible by re-verifying.
- **Moderation runs via `/api/moderate`** for every post, comment, and edit. Local rules run first; if `MODERATION_API_KEY` is set, OpenAI moderation runs after. Falls back to local-only if the network is flaky.

## Tech

- Next.js 16 App Router + React 19
- Tailwind CSS 3.4
- lucide-react icons
- Instrument Serif (display) + Geist (UI)
- Supabase (Postgres + Auth + Realtime + Row Level Security)

## License

Personal/community project. All rights reserved.
