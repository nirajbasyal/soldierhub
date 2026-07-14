drop view if exists public.public_profiles;
drop view if exists public.profile_follow_counts;

create or replace view public.public_profiles as
select
  id,
  full_name,
  bio,
  avatar_color,
  avatar_url,
  base,
  created_at
from public.profiles
where verification_status = 'verified';

create or replace view public.profile_follow_counts as
select
  p.id as profile_id,
  coalesce(followers.followers_count, 0::bigint) as followers_count,
  coalesce(following.following_count, 0::bigint) as following_count
from public.profiles p
left join (
  select following_id, count(*) as followers_count
  from public.profile_follows
  group by following_id
) followers on followers.following_id = p.id
left join (
  select follower_id, count(*) as following_count
  from public.profile_follows
  group by follower_id
) following on following.follower_id = p.id
where p.verification_status = 'verified';

grant select on public.public_profiles to anon, authenticated;
grant select on public.profile_follow_counts to anon, authenticated;

create index if not exists profiles_verification_status_created_idx
on public.profiles (verification_status, created_at desc, id desc);

create index if not exists profiles_verification_status_role_idx
on public.profiles (verification_status, role, id);
