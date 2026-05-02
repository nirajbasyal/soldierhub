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

## Phase 1 — Supabase setup (~25 min)

### 1.1 Create the project

1. Go to https://supabase.com and sign in (use GitHub if you can).
2. Click **New project**.
3. Settings:
   - **Name:** `soldier-hub`
   - **Database password:** Generate one and **save it in a password manager**. You will not need it day-to-day, but losing it means losing recovery access.
   - **Region:** Pick the one closest to El Paso — **US East (N. Virginia)** is fine.
   - **Plan:** Free tier is plenty for launch.
4. Click **Create new project**. Wait ~2 minutes for it to provision.

### 1.2 Run the schema

1. In the Supabase dashboard left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open `supabase/schema.sql` from your project, copy the entire contents, paste into the editor.
4. Click **Run** (or `Ctrl/Cmd + Enter`). You should see "Success. No rows returned."
5. New query → paste `supabase/policies.sql` → Run. Same success message.
6. **Skip `seed.sql` for production launch** — you only need it in development to fake some posts.

### 1.3 Verify tables

In the dashboard, click **Database → Tables**. You should see:
- `profiles`
- `posts`
- `comments`
- `upvotes`
- `reports`
- `notifications`

Each should show "RLS enabled" with a green shield. If any don't, re-run `policies.sql`.

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
<p>— Soldier Hub<br/><em>Unofficial. Not affiliated with the Department of War.</em></p>
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
where email = 'niraj.basyal2054@gmail.com';
```

Then sign up with `niraj.basyal2054@gmail.com` through the app. The `handle_new_user` trigger in `schema.sql` already auto-promotes that email to admin, so you'll be admin immediately on first signup. The SQL above is just a manual fallback.

After signing in as admin, refresh — you'll see the **Admin** button in the top nav. Click it to verify the test account you signed up earlier.

---

## Phase 4 — Custom domain (~30 min, mostly DNS waiting)

### 4.1 Add domain in Vercel

1. In your Vercel project: **Settings → Domains**.
2. Type `soldierhub.com` → **Add**.
3. Vercel will show you DNS records to add. Two options:

**Option A — Easier: transfer DNS to Vercel**
- In your registrar (Namecheap/GoDaddy/wherever you bought it), change the nameservers to Vercel's.
- Vercel handles the rest. ~1 hour for DNS propagation.

**Option B — Keep your registrar's DNS, add records**
- In your registrar's DNS settings, add:
  - **A record** `@` → `76.76.21.21`
  - **CNAME record** `www` → `cname.vercel-dns.com`
- ~10 minutes for DNS propagation.

### 4.2 Add www redirect

Back in Vercel **Settings → Domains**:
- Add `www.soldierhub.com` too.
- Set **Redirect www.soldierhub.com → soldierhub.com (308 permanent)**.

### 4.3 SSL

Vercel issues an SSL certificate automatically once DNS propagates. You'll see "Valid Configuration" with a green checkmark next to your domain.

### 4.4 Update Supabase redirect URLs

Go back to Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://soldierhub.com`
- **Additional redirect URLs:** make sure `https://soldierhub.com/auth/callback` is in the allow list.

### 4.5 Final test

Visit https://soldierhub.com. Everything should work. If signup emails are slow or going to spam, see the troubleshooting section below.

---

## Post-launch checklist

- [ ] Sign in as admin and verify your test profile actually got verified
- [ ] Create a test post → confirm it shows up in the feed
- [ ] Have a friend sign up → verify they appear in admin pending → verify them → confirm they can post
- [ ] Test report flow → comment notification flow → upvote flow
- [ ] Open the site on a phone → check mobile menu, bottom nav, post composer
- [ ] Submit signup at 100% browser zoom → confirm modal scrolls inside (the bug you originally reported)

---

## Troubleshooting

### "Invalid login credentials"
You signed up but didn't confirm your email yet. Check spam folder. The link expires after 24 hours — request a new one by trying to sign in again.

### Signup emails not arriving
Supabase free tier sends from `noreply@mail.app.supabase.io` and is rate-limited to ~30 emails/hour. For production volume, configure a custom SMTP provider in **Authentication → Email Settings** (Resend, Postmark, SendGrid all work).

### "Build failed" on Vercel
Check the build log. Most common causes:
- Missing environment variable → add it in **Settings → Environment Variables**, then click **Redeploy**.
- Syntax error in code you committed → fix and push again.

### Posts not appearing for new users
The user's profile has `status='pending'`. Sign in as admin, go to `/admin`, verify them.

### "permission denied for table posts"
Your RLS policies aren't set up. Re-run `supabase/policies.sql` in the SQL Editor.

### Domain shows "Invalid Configuration" in Vercel
DNS hasn't propagated yet. Wait 30 minutes, refresh. If still failing, check that the records you added actually saved in your registrar's panel.

### Realtime updates not coming through
In Supabase: **Database → Replication** → make sure `posts` and `notifications` tables have replication enabled (slider next to each).

### I deployed but the app behaves like local mode (no real auth, data resets on refresh)
Your env vars aren't set in Vercel. Production code reads them at build time, not runtime — after adding env vars, you must trigger a **Redeploy** (Vercel Settings → Deployments → ⋯ on latest → Redeploy).

---

## Ongoing operations

### Pushing updates

Edit code locally → commit → push to `main`:
```bash
git add .
git commit -m "describe the change"
git push
```

Vercel rebuilds and redeploys automatically. Takes ~90 seconds.

### Database migrations

When you change the schema:
1. Edit `supabase/schema.sql`.
2. Run the changed parts in Supabase SQL Editor.
3. Commit the file so it stays in sync with what's actually deployed.

Never run destructive SQL (DROP, DELETE without WHERE) on production without a backup.

### Backups

Supabase Free tier backs up daily and retains 7 days. For more, upgrade to Pro ($25/month) which gives you point-in-time recovery.

### Monitoring

- **Errors:** browser dev tools → console; for production add Sentry (https://sentry.io free tier).
- **Performance:** Vercel Analytics is free for basic metrics.
- **Database health:** Supabase dashboard → **Reports**.

---

## Costs

| Service             | Free tier                                  | When to upgrade                |
| ------------------- | ------------------------------------------ | ------------------------------ |
| **Vercel**          | 100 GB bandwidth/mo, unlimited deploys     | When bandwidth exceeds free    |
| **Supabase**        | 500 MB DB, 1 GB storage, 50K monthly users | When approaching DB limit      |
| **Domain**          | ~$12/year                                  | Already paid                   |

Realistic estimate: **$0/month** for the first 6–12 months at small-community scale. Upgrading both Pro: ~$45/month total.

---

## Next steps after launch

Once you have real users and feedback:

1. **Add image uploads** — wire up Supabase Storage in `src/lib/storage/`.
2. **Better moderation** — set `MODERATION_API_KEY` to enable AI moderation.
3. **Custom email templates** — switch Supabase to your own SMTP for branded emails.
4. **Analytics** — add Plausible or Vercel Analytics to see what people actually use.
5. **Push notifications** — add web push so users get pinged when someone replies.

Good luck with the launch.
