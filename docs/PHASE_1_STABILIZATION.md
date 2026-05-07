# SoldierHub Phase 1 Stabilization Checklist

## Goal

Phase 1 is complete when SoldierHub feels stable enough for a small private real-user test. This phase is not about adding many new features. It is about making the current product reliable, smooth, and consistent on mobile and desktop.

When this checklist is complete, move to Phase 2: Security Review.

---

## 1. Build and Runtime Stability

- [ ] Vercel production deploy succeeds without build errors.
- [ ] Local development starts without critical errors.
- [ ] No blank white pages during normal navigation.
- [ ] No React hook order warnings.
- [ ] No hydration warnings from invalid HTML nesting.
- [ ] No missing function/import runtime errors.
- [ ] Browser console has no repeated critical errors on core pages.

Core pages to test:

- [ ] `/`
- [ ] `/profile`
- [ ] `/notifications`
- [ ] `/resources`
- [ ] `/admin`
- [ ] `/pending-review`
- [ ] `/users/[userId]`
- [ ] `/post/[postId]`

---

## 2. Authentication Flow

- [ ] Logged-out users can browse public feed posts.
- [ ] Logged-out users cannot post, comment, upvote, or report without login prompt.
- [ ] New user can create an account.
- [ ] Signup requires confirm password.
- [ ] Optional military email and phone fields work.
- [ ] Email confirmation works.
- [ ] User sees pending-review state after email confirmation.
- [ ] Pending user cannot post or comment until verified.
- [ ] Verified user can access full app features.
- [ ] Rejected/revoked user flow is clear and not confusing.
- [ ] Logout works.
- [ ] Forgot password/reset password flow works.

---

## 3. Feed Stability and UX

- [ ] Feed posts load without long blank delay.
- [ ] Cached feed posts show quickly after first visit.
- [ ] Live Supabase posts refresh after cached posts show.
- [ ] Feed skeleton only appears when there is no cached data.
- [ ] Category strip works on mobile and desktop.
- [ ] Search filters posts correctly.
- [ ] Post composer works for verified users.
- [ ] Post composer blocks unverified/logged-out users correctly.
- [ ] Anonymous posting works.
- [ ] Category selection during posting works.
- [ ] Long text posts display cleanly with expand/collapse behavior.
- [ ] Post card UI is consistent across feed and visitor profile pages.

---

## 4. Post Actions

- [ ] Upvote works once per user.
- [ ] Clicking upvote again removes the upvote.
- [ ] Upvote icon fills only when active.
- [ ] Reply button opens comments smoothly.
- [ ] Reply icon fills when comments are open.
- [ ] Share button shares only the post link.
- [ ] Shared post link opens the correct post page.
- [ ] Report post works.
- [ ] Reported post displays a clear under-review message.
- [ ] One user cannot repeatedly report the same post.

---

## 5. Comments and Replies

- [ ] Replies load without long blank delay.
- [ ] Cached replies show quickly after first load.
- [ ] Live replies refresh silently after cached replies show.
- [ ] Posting a comment only creates one comment.
- [ ] Comment moderation blocks unsafe text gracefully.
- [ ] Anonymous post author replies display safely.
- [ ] Reply count updates after comment.
- [ ] Empty comments state is clear.
- [ ] Comment error state is clear.

---

## 6. Profile Pages

### Own profile

- [ ] Own profile header loads quickly.
- [ ] Own profile header is compact on mobile.
- [ ] User can edit display name, bio, and avatar color.
- [ ] Verified email cannot be edited from profile.
- [ ] Password update works.
- [ ] User posts load quickly.
- [ ] Cached user posts show quickly after first load.
- [ ] Edit own post works.
- [ ] Delete own post works with confirmation.

### Visitor profile

- [ ] Visitor profile page loads quickly.
- [ ] Cached visitor profile appears quickly after first visit.
- [ ] Visitor profile posts use same UI as feed post cards.
- [ ] Visitors can upvote, reply, share, and report from visitor profile posts.
- [ ] Anonymous posts do not expose private author identity.
- [ ] Own profile redirects from visitor URL to `/profile` when appropriate.

---

## 7. Notifications

- [ ] Notifications page does not stay blank for too long.
- [ ] Cached notifications show after first load.
- [ ] Live notifications replace cached notifications when ready.
- [ ] New reply creates a notification for the post owner.
- [ ] User does not receive notification for their own comment on their own post, unless intentionally designed otherwise.
- [ ] Notification count appears correctly in nav/mobile nav.
- [ ] Opening notifications marks notifications as read.
- [ ] Notification item opens the correct post/context.
- [ ] Empty notification state is clear.

---

## 8. Admin Stability

- [ ] Admin page is accessible only to admin user.
- [ ] Non-admin users cannot see or use admin controls.
- [ ] Pending users list loads correctly.
- [ ] Admin can verify pending users.
- [ ] Admin can reject pending users.
- [ ] Admin can revoke verified users.
- [ ] Admin can search users by email/name.
- [ ] Reported posts show correctly.
- [ ] Admin can restore/reject report and return post to feed.
- [ ] Admin can permanently delete reported post with confirmation.
- [ ] Admin actions update the UI without needing a full refresh.

---

## 9. Mobile UI Polish

- [ ] Home feed looks clean on phone.
- [ ] Feed hero is not too tall on phone.
- [ ] Profile header is not too tall on phone.
- [ ] Notification page has no white blank flash.
- [ ] Bottom nav works and active states make sense.
- [ ] Mobile menu opens and closes smoothly.
- [ ] Buttons are large enough to tap.
- [ ] Cards do not have awkward left/right gaps.
- [ ] No horizontal scrolling issues.
- [ ] Long names/emails do not break layout.

---

## 10. Error and Empty States

- [ ] Failed feed load shows a friendly error or retry state.
- [ ] Failed comments load shows a friendly error or retry state.
- [ ] Failed notifications load shows a friendly error or retry state.
- [ ] Failed profile load shows a friendly error or not-found state.
- [ ] Empty feed state is clear.
- [ ] Empty profile posts state is clear.
- [ ] Empty comments state is clear.
- [ ] Empty notifications state is clear.

---

## 11. Phase 1 Exit Criteria

Do not move to Phase 2 until all of these are true:

- [ ] A verified user can complete the full normal flow without errors.
- [ ] A logged-out user can browse safely and is blocked from restricted actions.
- [ ] An admin can verify users and manage reported posts.
- [ ] Feed, profile, comments, and notifications feel fast enough on mobile.
- [ ] No major console/runtime errors appear during manual testing.
- [ ] Mobile UI feels consistent and trustworthy.
- [ ] The app is ready for a small private beta group of trusted users.

---

## Phase 2 Reminder

When this checklist is complete, the next phase is:

**Phase 2: Security Review**

Phase 2 will focus on Supabase RLS, admin permission boundaries, anonymous post privacy, profile privacy, report abuse prevention, notification privacy, legal disclaimers, and production user safety.
