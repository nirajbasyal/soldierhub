-- Fix profile_follows RLS privacy.
--
-- Problem:
-- The older "Verified users can read own follow graph" policy included an OR EXISTS
-- clause that became true for any verified user, effectively allowing verified
-- members to read the full follow graph.
--
-- Intended behavior:
-- A verified user may only read follow rows involving themselves.

begin;

alter table public.profile_follows enable row level security;

-- Remove the overly broad policy and duplicate/older select policies.
drop policy if exists "Verified users can read own follow graph" on public.profile_follows;
drop policy if exists "Verified users can read follow rows involving themselves" on public.profile_follows;
drop policy if exists profile_follows_select_own on public.profile_follows;

-- Keep reads limited to rows where the current user is either follower or followed.
create policy profile_follows_select_self_only
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using (
    is_verified_profile(auth.uid())
    and (
      auth.uid() = follower_id
      or auth.uid() = following_id
    )
  );

commit;
-- Canonical 14-digit migration version; normalized during history reconciliation.
