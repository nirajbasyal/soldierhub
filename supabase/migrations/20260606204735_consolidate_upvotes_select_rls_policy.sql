-- Consolidate upvotes authenticated SELECT RLS policies
-- Keeps the same access behavior:
--   - users can read their own vote rows
--   - admins can read all vote rows
-- Reduces multiple permissive SELECT policy warning for authenticated role.

begin;

drop policy if exists "upvotes: admins can read all" on public.upvotes;
drop policy if exists "upvotes: users can read own votes" on public.upvotes;

create policy "upvotes: authenticated read allowed"
on public.upvotes
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

commit;
