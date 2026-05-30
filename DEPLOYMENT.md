# Deployment Guide — Launching soldierhub.com

End-to-end instructions to take this from a folder on your laptop to a live site at **https://soldierhub.com**.

Estimated total time: **~90 minutes** (the SQL setup is the slowest part; most of that is waiting for Supabase to provision the project).

---

## Overview

You'll set up four things, in this order:

1. **Supabase project** — your database + auth provider
2. **GitHub repo** — version control + Vercel deploy source
3. **Vercel project** — hosting + automatic deploys
4. **Custom domain** — point soldierhub.com at Vercel

---

## Critical database source-of-truth rule

For production, **do not restore or rebuild the database by blindly running `supabase/schema.sql` and `supabase/policies.sql` only**.

Those files may be useful as an older snapshot/reference, but the production source of truth is the ordered SQL in:

```txt
supabase/migrations/
```

Run migrations in filename order. New production SQL changes must be added as new migration files and committed to the repo. This keeps the live Supabase database and GitHub repo synced.

For an emergency rebuild or a new Supabase project, start from the base schema only if needed, then apply every migration in `supabase/migrations/` in order. Do not re-run stale policy files after newer hardening migrations, because older broad policies can undo newer privacy/security fixes.

---

## Phase 1 — Supabase setup (~25 min)

### 1.1 Create the project

1. Go to https://supabase.com and sign in (use GitHub if you can).
2. Click **New project**.
3. Settings:
   - **Name:** `soldier-hub`
   - **Database password:** Generate one and **save it in a password manager**. You will not need it day-to-day, but losing it means losing recovery access.
   - **Region:** Pick the one closest to El Paso — **US East (N. Virginia)** is fine.
   - **Plan:** Use a paid project for production launch. Free tier is okay only for early testing.
4. Click **Create new project**. Wait ~2 minutes for it to provision.

### 1.2 Run the database SQL

1. In the Supabase dashboard left sidebar, click **SQL Editor**.
2. Click **New query**.
3. For a fresh setup, apply the base schema only if the database is empty and you need the original tables/functions.
4. Then apply every file in `supabase/migrations/` in filename order.
5. **Do not run `supabase/policies.sql` after newer migrations** unless you have reviewed it carefully, because it may recreate older broad policies that newer migrations intentionally replaced.
6. **Skip `seed.sql` for production launch** — you only need it in development to fake some posts.

### 1.3 Verify tables

In the dashboard, click **Database → Tables**. You should see:
- `profiles`
- `posts`
- `comments`
- `upvotes`
- `reports`
- `notifications`

Each should show "RLS enabled" with a green shield. If any do not, stop and review the migration history before opening production traffic.

### 1.4 Configure email auth

1. **Authentication → Providers** in the sidebar.
2. **Email** is enabled by default. Verify these settings:
   - ✅ Enable email signups
   - ✅ Confirm email *(recommended — prevents bot signups)*
   - ❌ Secure email change *(can disable for simplicity)*

3. **Authentication → URL Configuration**:
   - **Site URL:** `https://soldierhub.com` *(after launch — for now use `http://localhost:3000` while testing)*
   - **Redirect URLs (allow list):** Add all of:
     ```
     http://localhost:3000/auth/callback
     https://soldierhub.com/auth/callback
     https://*.vercel.app/auth/callback
     ```

### 1.5 Customize the confirmation email (optional but recommended)

**Authentication → Email Templates → Confirm signup**. Replace the default with:

```html
<h2>Welcome to Soldier Hub</h2>
<p>Hi there,</p>
<p>Thanks for joining the Fort Bliss community. Click the button below to confirm your email address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
<p>After confirming, an admin will review your profile and verify it for posting access.</p>
<p>— Soldier Hub<br/><em>Unofficial. Not affiliated with the U.S. Government, Department of Defense, Army, or any installation.</em></p>
```

### 1.6 Grab your API keys

**Settings (gear icon) → API**:

- **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY` *(only used server-side, never expose to browser)*

Keep this tab open — you'll paste these into Vercel in Phase 3.

---

## Phase 2 — GitHub setup (~10 min)

### 2.1 Create the repo

1. Sign in to https://github.com.
2. Click **New repository**.
3. Settings:
   - **Name:** `soldier-hub`
   - **Visibility:** Private *(recommended — your code stays yours; Vercel can still access it)*
   - Don't initialize with README/license/.gitignore (we already have those).
4. Click **Create repository**. Don't close the page yet — you'll need the URL.

### 2.2 Push your code

In a terminal, in your project folder:

```bash
npm install                # generates package-lock.json — commit this!
git init
git add .
git commit -m "Initial commit: Soldier Hub launch ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/soldier-hub.git
git push -u origin main
```

The `npm install` step generates `package-lock.json`, which pins exact dependency versions. Committing it ensures Vercel installs the same versions you tested locally — without it, builds can break weeks later when a transitive dependency releases a buggy patch version.

**Replace `YOUR_USERNAME`** with your actual GitHub username. Use the URL GitHub showed you.

If git asks for credentials, use a personal access token instead of your password (GitHub deprecated password auth). Generate one at https://github.com/settings/tokens?type=beta.

### 2.3 Verify

Refresh the GitHub repo page. You should see all your files. Confirm `.env.local` is **not** there (it shouldn't be — it's in `.gitignore`).

---

## Phase 3 — Vercel deployment (~15 min)

### 3.1 Import the project

1. Go to https://vercel.com and sign in with GitHub.
2. Click **Add New → Project**.
3. Find `soldier-hub` in the list → click **Import**.
4. Vercel auto-detects Next.js. Don't change framework or build settings.

### 3.2 Add environment variables

Before clicking Deploy, expand **Environment Variables** and add these. **All three environments** (Production, Preview, Development) should have them:

| Name                              | Value                                  |
| --------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | (from Supabase → Settings → API)       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | (from Supabase → Settings → API)       |
| `NEXT_PUBLIC_SITE_URL`            | `https://soldierhub.com`               |
| `MODERATION_API_KEY`              | (optional — your OpenAI key)           |
| `UPSTASH_REDIS_REST_URL`          | (from Upstash Redis / Vercel KV)       |
| `UPSTASH_REDIS_REST_TOKEN`        | (from Upstash Redis / Vercel KV)       |
| `R2_ACCOUNT_ID`                   | (from Cloudflare R2)                   |
| `R2_ACCESS_KEY_ID`                | (from Cloudflare R2)                   |
| `R2_SECRET_ACCESS_KEY`            | (from Cloudflare R2)                   |
| `R2_BUCKET_NAME`                  | (from Cloudflare R2)                   |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`  | (public R2/custom-domain image URL)    |
| `NEXT_PUBLIC_SENTRY_DSN`          | (from Sentry, if enabled)              |
| `SENTRY_DSN`                      | (from Sentry, if enabled)              |

> Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel unless you have a server
> route that actually needs it. The service role bypasses RLS — storing it
> when unused is a security liability. Add it only when you build a
> server-side admin function that requires it.

### 3.3 Deploy

Click **Deploy**. First deploy takes ~2 minutes. You'll get a URL like `soldier-hub-abc123.vercel.app` when it's done. Open it.

### 3.4 First-time tests

Before pointing your domain at it, verify these work on the Vercel URL:

- [ ] Home page loads with hero + feed
- [ ] Resources page renders with all link sections
- [ ] BAH calculator works
- [ ] Sign up with **your real email** (not the admin one yet) — you should get a confirmation email
- [ ] Click the confirmation link → it should redirect back to your site, signed in
- [ ] You should see the "pending review" page — that's correct, you're not verified yet

### 3.5 Make yourself admin

In Supabase **SQL Editor**, run:

```sql
update public.profiles
set role = 'admin', status = 'verified'
where id = 'YOUR_USER_ID';
```
