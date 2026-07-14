-- Consolidate profiles/reports RLS policies to reduce multiple permissive policy evaluation.
-- This keeps the same intended access model while using one policy per role/action.

begin;

-- --------------------------------------------------------------------------
-- public.profiles
-- Previous SELECT policies:
--   - users can read their own profile
--   - admins can read all profiles
-- New SELECT policy keeps both cases in one policy.
-- --------------------------------------------------------------------------
drop policy if exists "profiles: admins can read all profiles" on public.profiles;
drop policy if exists "profiles: users can read their own profile" on public.profiles;

create policy "profiles: authenticated read allowed"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

-- Previous UPDATE policies:
--   - users can update their own profile
--   - admins can update any profile
-- New UPDATE policy keeps both cases in one policy.
-- Existing database triggers/functions continue to protect sensitive fields.
drop policy if exists "profiles: admins can update any profile" on public.profiles;
drop policy if exists "profiles: users can update their own profile" on public.profiles;

create policy "profiles: authenticated update allowed"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  id = (select auth.uid())
  or (select public.is_admin())
);

-- Keep existing DELETE policy separate because there is only one DELETE policy.
--   "profiles: admins can delete any profile"

-- --------------------------------------------------------------------------
-- public.reports
-- Previous SELECT policies:
--   - users can see own reports
--   - admins can read reports
-- New SELECT policy keeps both cases in one policy.
-- --------------------------------------------------------------------------
drop policy if exists "reports: admins can read" on public.reports;
drop policy if exists "reports: users can see own reports" on public.reports;

create policy "reports: authenticated read allowed"
on public.reports
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

-- Keep existing INSERT and DELETE policies separate because each action already
-- has one policy:
--   "reports: verified users can report"
--   "reports: admins can clear reports"

commit;
