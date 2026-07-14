begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.profile_follows enable row level security;

-- Remove legacy/overlapping follow policies. Multiple permissive policies are OR'd,
-- so keeping duplicate routes makes the effective access rule harder to audit.
drop policy if exists "Verified users can follow members" on public.profile_follows;
drop policy if exists "Verified users can unfollow members" on public.profile_follows;
drop policy if exists "Verified users can read own follow graph" on public.profile_follows;
drop policy if exists "Verified users can read follow rows involving themselves" on public.profile_follows;
drop policy if exists profile_follows_select_own on public.profile_follows;

-- Recreate one canonical policy per action.
drop policy if exists profile_follows_select_self_only on public.profile_follows;
create policy profile_follows_select_self_only
  on public.profile_follows
  as permissive
  for select
  to authenticated
  using (
    public.is_verified_profile(auth.uid())
    and (
      auth.uid() = follower_id
      or auth.uid() = following_id
    )
  );

drop policy if exists profile_follows_insert_own_verified on public.profile_follows;
create policy profile_follows_insert_own_verified
  on public.profile_follows
  as permissive
  for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and public.is_verified_profile(follower_id)
    and public.is_verified_profile(following_id)
  );

drop policy if exists profile_follows_delete_own on public.profile_follows;
create policy profile_follows_delete_own
  on public.profile_follows
  as permissive
  for delete
  to authenticated
  using (auth.uid() = follower_id);

grant select, insert, delete on public.profile_follows to authenticated;

commit;
