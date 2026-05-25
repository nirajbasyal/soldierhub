-- ============================================================================
-- Soldier Hub hotfix: fix profiles UPDATE RLS recursion
-- ============================================================================
-- Problem:
--   Updating profile fields such as bio can fail with:
--   "infinite recursion detected in policy for relation \"profiles\""
--
-- Cause:
--   The previous profiles UPDATE policy queried public.profiles from inside an
--   RLS policy on public.profiles. PostgreSQL then re-applies the same table's
--   policies while evaluating the policy, causing recursion.
--
-- Fix:
--   Keep the ownership check in RLS only: the signed-in user can update only
--   their own profile row.
--
-- Security note:
--   Sensitive/admin-controlled fields remain protected by the existing
--   BEFORE UPDATE trigger public.protect_profile_sensitive_fields(), which
--   blocks normal users from changing id, email, role, status,
--   verification_status, and other protected fields.
-- ============================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.profiles enable row level security;

drop policy if exists "profiles: users can update their own profile" on public.profiles;

create policy "profiles: users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

commit;
