-- Stage 1 compatibility cleanup for profiles.status / profiles.verification_status drift.
-- Keep both columns for now, but make verification_status the canonical value.

-- Normalize existing rows so the legacy mirror matches verification_status.
update public.profiles
set verification_status = status
where verification_status is null
  and status is not null;

update public.profiles
set status = verification_status
where verification_status is not null
  and status is distinct from verification_status;

-- Keep both columns mirrored during the compatibility period.
-- verification_status wins when both columns are changed in the same statement.
create or replace function public.sync_profile_verification_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.verification_status := coalesce(nullif(new.verification_status, ''), nullif(new.status, ''), 'pending');
    new.status := new.verification_status;
  else
    if new.verification_status is distinct from old.verification_status then
      new.verification_status := coalesce(nullif(new.verification_status, ''), 'pending');
      new.status := new.verification_status;
    elsif new.status is distinct from old.status then
      -- Legacy compatibility: status-only updates still update the canonical column.
      new.status := coalesce(nullif(new.status, ''), 'pending');
      new.verification_status := new.status;
    else
      -- Any unrelated profile update keeps the legacy mirror aligned.
      new.verification_status := coalesce(nullif(new.verification_status, ''), 'pending');
      new.status := new.verification_status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_verification_status on public.profiles;
create trigger trg_sync_profile_verification_status
before insert or update on public.profiles
for each row
execute function public.sync_profile_verification_status();

-- Verification helper now uses verification_status as the single canonical read.
create or replace function public.is_verified_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.verification_status = 'verified'
  );
$$;

-- Admin queues now filter by verification_status.
create or replace function public.admin_list_profiles(
  p_queue text default 'pending',
  p_limit integer default 50
)
returns table(
  id uuid,
  full_name text,
  email text,
  personal_email text,
  phone text,
  bio text,
  avatar_color text,
  avatar_url text,
  role text,
  status text,
  verification_status text,
  base text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue text := lower(trim(coalesce(p_queue, 'pending')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if auth.uid() is null then
    raise exception 'Please log in again before loading admin profiles.';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access is required to load profile queues.';
  end if;

  if v_queue not in ('pending', 'verified', 'blocked') then
    raise exception 'Invalid admin profile queue.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.personal_email,
    p.phone,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.role,
    p.status,
    p.verification_status,
    p.base,
    p.created_at,
    p.updated_at
  from public.profiles p
  where
    (v_queue = 'pending' and p.verification_status = 'pending')
    or (v_queue = 'verified' and p.verification_status = 'verified')
    or (v_queue = 'blocked' and p.verification_status in ('rejected', 'revoked'))
  order by p.created_at desc, p.id desc
  limit v_limit;
end;
$$;

create or replace function public.admin_reject_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject profiles.';
  end if;

  update public.profiles
  set
    verification_status = 'rejected',
    status = 'rejected',
    updated_at = now()
  where id = p_profile_id
    and verification_status = 'pending';
end;
$$;

create or replace function public.admin_revoke_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke profiles.';
  end if;

  update public.profiles
  set
    verification_status = 'revoked',
    status = 'revoked',
    updated_at = now()
  where id = p_profile_id
    and verification_status = 'verified';
end;
$$;

create or replace function public.request_profile_rereview(p_phone text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request re-review.';
  end if;

  update public.profiles
  set
    verification_status = 'pending',
    status = 'pending',
    phone = coalesce(nullif(p_phone, ''), phone),
    updated_at = now()
  where id = auth.uid()
    and verification_status in ('rejected', 'revoked');
end;
$$;

create or replace function public.create_comment_safe(p_post_id uuid, p_body text)
returns table(
  id uuid,
  comment_id uuid,
  post_id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  author_user_id uuid,
  author_name_cached text,
  author_color_cached text,
  author_avatar_url text,
  author_avatar_url_cached text,
  profile_avatar_url text,
  avatar_url text,
  is_anonymous_author boolean,
  viewer_is_author boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to comment.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.verification_status = 'verified'
  ) then
    raise exception 'Your profile must be verified before you can comment.';
  end if;

  if p_post_id is null then
    raise exception 'Post was not identified.';
  end if;

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'Please write a comment before posting.';
  end if;

  if length(trim(p_body)) > 2000 then
    raise exception 'Comment must be 2000 characters or less.';
  end if;

  insert into public.comments (post_id, author_id, body)
  values (p_post_id, v_user_id, trim(p_body))
  returning comments.id into v_comment_id;

  return query
  select gc.*
  from public.get_public_comments_for_post(p_post_id, 100) gc
  where gc.id = v_comment_id;
end;
$$;

create or replace function public.delete_comment_safe(p_comment_id uuid)
returns table(ok boolean, deleted_comment_id uuid, affected_post_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment record;
  v_is_verified boolean := false;
  v_is_admin boolean := false;
begin
  if v_user_id is null then
    raise exception 'Please log in again before deleting this comment.'
      using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.verification_status = 'verified'
  ) into v_is_verified;

  if not v_is_verified then
    raise exception 'Your profile must be verified before deleting comments.'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'admin'
      and p.verification_status = 'verified'
  ) into v_is_admin;

  select c.id, c.post_id, c.author_id, c.deleted_at
  into v_comment
  from public.comments c
  where c.id = p_comment_id
  for update;

  if not found then
    raise exception 'This comment no longer exists.'
      using errcode = 'P0002';
  end if;

  if v_comment.deleted_at is not null then
    return query select true, v_comment.id, v_comment.post_id;
    return;
  end if;

  if v_comment.author_id <> v_user_id and not v_is_admin then
    raise exception 'You can only delete your own comment.'
      using errcode = '42501';
  end if;

  update public.comments
  set
    deleted_at = now(),
    deleted_by = v_user_id,
    deleted_reason = case
      when v_is_admin and v_comment.author_id <> v_user_id then 'admin_deleted'
      else 'user_deleted'
    end,
    body = '[deleted]'
  where id = p_comment_id
    and deleted_at is null;

  delete from public.notifications
  where comment_id = p_comment_id;

  return query select true, v_comment.id, v_comment.post_id;
end;
$$;

create or replace function public.find_verified_profile_by_email(p_email text)
returns table(id uuid, full_name text, avatar_color text, avatar_url text, base text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then
    raise exception 'Please sign in before searching member profiles.';
  end if;

  if not public.is_verified_profile(auth.uid()) then
    raise exception 'Verified account required to search member profiles.';
  end if;

  if clean_email = '' or position('@' in clean_email) = 0 then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(p.full_name, 'SoldierHub member')::text as full_name,
    coalesce(p.avatar_color, '#314A66')::text as avatar_color,
    p.avatar_url::text as avatar_url,
    coalesce(p.base, 'Fort Bliss')::text as base
  from public.profiles p
  where p.verification_status = 'verified'
    and (
      lower(coalesce(p.email, '')) = clean_email
      or lower(coalesce(p.personal_email, '')) = clean_email
    )
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;
end;
$$;

create or replace function public.search_verified_profiles(
  p_query text,
  p_limit integer default 8,
  p_offset integer default 0
)
returns table(id uuid, full_name text, avatar_color text, avatar_url text, base text, match_type text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_query text := trim(coalesce(p_query, ''));
  clean_query_lower text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 8), 1), 25);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  looks_like_email boolean := trim(coalesce(p_query, '')) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$';
begin
  if auth.uid() is null then
    raise exception 'Please sign in before searching member profiles.';
  end if;

  if not public.is_verified_profile(auth.uid()) then
    raise exception 'Verified account required to search member profiles.';
  end if;

  if length(clean_query) < 2 then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(p.full_name, 'SoldierHub member')::text as full_name,
    coalesce(p.avatar_color, '#314A66')::text as avatar_color,
    p.avatar_url::text as avatar_url,
    coalesce(p.base, 'Fort Bliss')::text as base,
    case
      when looks_like_email and lower(coalesce(p.email, '')) = clean_query_lower then 'email'
      else 'name'
    end::text as match_type
  from public.profiles p
  where p.verification_status = 'verified'
    and (
      (p.full_name is not null and lower(p.full_name) like clean_query_lower || '%')
      or (looks_like_email and p.email is not null and lower(p.email) = clean_query_lower)
    )
  order by
    case when looks_like_email and lower(coalesce(p.email, '')) = clean_query_lower then 0 else 1 end,
    case when lower(coalesce(p.full_name, '')) = clean_query_lower then 0 else 1 end,
    p.full_name asc,
    p.updated_at desc nulls last,
    p.created_at desc nulls last
  offset safe_offset
  limit safe_limit;
end;
$$;

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

create index if not exists profiles_verification_status_created_idx
on public.profiles (verification_status, created_at desc, id desc);

create index if not exists profiles_verification_status_role_idx
on public.profiles (verification_status, role, id);
