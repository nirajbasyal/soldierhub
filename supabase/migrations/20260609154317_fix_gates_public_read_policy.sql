begin;

-- Fix public gate-hours reads after switching the frontend to Supabase-only data.
-- The previous SELECT policy called public.is_admin() for every request. Anonymous
-- requests do not need that admin branch and can fail depending on execution context.
-- Keep active gates public, and keep inactive/all-gate visibility authenticated-admin only.

drop policy if exists "Public can read active gate hours" on public.gates;

drop policy if exists "Anyone can read active gate hours" on public.gates;
create policy "Anyone can read active gate hours"
on public.gates
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can read all gate hours" on public.gates;
create policy "Admins can read all gate hours"
on public.gates
for select
to authenticated
using (public.is_admin());

grant select on public.gates to anon, authenticated;

commit;
