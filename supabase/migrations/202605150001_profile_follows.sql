-- SoldierHub profile follows
-- Run this in Supabase SQL editor before testing the follower/following UI.

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_pkey primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists profile_follows_follower_idx
  on public.profile_follows (follower_id, created_at desc);

create index if not exists profile_follows_following_idx
  on public.profile_follows (following_id, created_at desc);

alter table public.profile_follows enable row level security;

-- Clean up older versions of these policies safely.
drop policy if exists "Verified users can read own follow graph" on public.profile_follows;
drop policy if exists "Verified users can follow members" on public.profile_follows;
drop policy if exists "Verified users can unfollow members" on public.profile_follows;

create policy "Verified users can read own follow graph"
  on public.profile_follows
  for select
  to authenticated
  using (
    auth.uid() = follower_id
    or auth.uid() = following_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.status, p.verification_status) = 'verified'
    )
  );

create policy "Verified users can follow members"
  on public.profile_follows
  for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and coalesce(viewer.status, viewer.verification_status) = 'verified'
    )
    and exists (
      select 1
      from public.profiles target
      where target.id = following_id
        and coalesce(target.status, target.verification_status) = 'verified'
    )
  );

create policy "Verified users can unfollow members"
  on public.profile_follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

create or replace view public.profile_follow_counts
with (security_invoker = true) as
select
  p.id as profile_id,
  count(distinct followers.follower_id) as followers_count,
  count(distinct following.following_id) as following_count
from public.profiles p
left join public.profile_follows followers
  on followers.following_id = p.id
left join public.profile_follows following
  on following.follower_id = p.id
group by p.id;

grant select on public.profile_follow_counts to anon, authenticated;
grant select, insert, delete on public.profile_follows to authenticated;
