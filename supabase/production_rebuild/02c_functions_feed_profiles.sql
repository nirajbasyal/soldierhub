-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- FUNCTIONS continued
CREATE OR REPLACE FUNCTION public.get_public_posts(limit_count integer DEFAULT 50, cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, cursor_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, author_id uuid, category text, body text, anonymous boolean, status text, edited boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_name text, author_color text, upvote_count bigint, comment_count bigint, report_count bigint, image_url text, image_key text, image_width integer, image_height integer, image_size integer, image_thumbnail_url text, image_thumbnail_key text, image_thumbnail_width integer, image_thumbnail_height integer, image_thumbnail_size integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                              select
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      case when p.anonymous then null else p.author_id end as author_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.category,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.body,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.anonymous,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p.status,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.edited,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.created_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.updated_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      case when p.anonymous then null else p.author_name_cached end as author_name,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          case when p.anonymous then null else p.author_color_cached end as author_color,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              coalesce(p.upvote_count, 0)::bigint as upvote_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  coalesce(p.comment_count, 0)::bigint as comment_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      coalesce(p.report_count, 0)::bigint as report_count,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.image_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.image_key,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.image_width,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p.image_height,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.image_size,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.image_thumbnail_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p.image_thumbnail_key,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      p.image_thumbnail_width,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          p.image_thumbnail_height,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.image_thumbnail_size
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                from public.posts p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  where p.status in ('active', 'reported')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      and (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            cursor_created_at is null
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  or cursor_id is null
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        or (p.created_at, p.id) < (cursor_created_at, cursor_id)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              order by p.created_at desc, p.id desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                limit greatest(1, least(limit_count, 50));
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                $function$;


CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_color text, avatar_url text, role text, status text, verification_status text, base text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.full_name,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    null::text as role,
    null::text as status,
    null::text as verification_status,
    p.base,
    p.created_at
  from public.profiles p
  where p.id = p_user_id
    and p.status = 'verified'
    and p.verification_status = 'verified'
  limit 1;
$function$;


CREATE OR REPLACE FUNCTION public.get_public_profiles_for_ids(p_user_ids uuid[])
 RETURNS TABLE(id uuid, full_name text, bio text, avatar_color text, avatar_url text, base text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with safe_ids as (
    select distinct user_id
    from unnest(coalesce(p_user_ids, array[]::uuid[])) as user_id
    where user_id is not null
    limit 100
  )
  select
    p.id,
    p.full_name,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.base,
    p.created_at
  from safe_ids s
  join public.profiles p
    on p.id = s.user_id
  where p.status = 'verified'
    and p.verification_status = 'verified';
$function$;


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
      id,
          email,
              personal_email,
                  full_name,
                      phone,
                          bio,
                              avatar_color,
                                  base,
                                      role,
                                          status,
                                              verification_status,
                                                  created_at,
                                                      updated_at
                                                        )
                                                          values (
                                                              new.id,
                                                                  lower(coalesce(new.email, '')),
                                                                      lower(coalesce(new.raw_user_meta_data ->> 'personal_email', new.email, '')),
                                                                          coalesce(
                                                                                nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                                                                                      split_part(coalesce(new.email, ''), '@', 1),
                                                                                            'SoldierHub Member'
                                                                                                ),
                                                                                                    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
                                                                                                        coalesce(new.raw_user_meta_data ->> 'bio', ''),
                                                                                                            coalesce(nullif(new.raw_user_meta_data ->> 'avatar_color', ''), '#314A66'),
                                                                                                                'Fort Bliss',
                                                                                                                    'user',
                                                                                                                        'pending',
                                                                                                                            'pending',
                                                                                                                                now(),
                                                                                                                                    now()
                                                                                                                                      )
                                                                                                                                        on conflict (id) do update set
                                                                                                                                            email = excluded.email,
                                                                                                                                                personal_email = excluded.personal_email,
                                                                                                                                                    full_name = excluded.full_name,
                                                                                                                                                        phone = excluded.phone,
                                                                                                                                                            bio = excluded.bio,
                                                                                                                                                                avatar_color = excluded.avatar_color,
                                                                                                                                                                    updated_at = now();

                                                                                                                                                                      return new;
                                                                                                                                                                      end;
                                                                                                                                                                      $function$;


CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'verified'
      and verification_status = 'verified'
  );
$function$;


CREATE OR REPLACE FUNCTION public.is_verified()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'verified'
      and verification_status = 'verified'
  );
$function$;


CREATE OR REPLACE FUNCTION public.is_verified_profile(p_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.status = 'verified'
      and p.verification_status = 'verified'
  );
$function$;


CREATE OR REPLACE FUNCTION public.list_my_follow_connections(p_list_type text DEFAULT 'followers'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text, followed_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                        declare
                                                                                                                                                                                                                                                                                                                                          safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
                                                                                                                                                                                                                                                                                                                                            safe_offset integer := greatest(coalesce(p_offset, 0), 0);
                                                                                                                                                                                                                                                                                                                                            begin
                                                                                                                                                                                                                                                                                                                                              if auth.uid() is null then
                                                                                                                                                                                                                                                                                                                                                  raise exception 'Authentication required';
                                                                                                                                                                                                                                                                                                                                                    end if;

                                                                                                                                                                                                                                                                                                                                                      if not public.is_verified_profile(auth.uid()) then
                                                                                                                                                                                                                                                                                                                                                          raise exception 'Verified account required';
                                                                                                                                                                                                                                                                                                                                                            end if;

                                                                                                                                                                                                                                                                                                                                                              if lower(coalesce(p_list_type, 'followers')) = 'following' then
                                                                                                                                                                                                                                                                                                                                                                  return query
                                                                                                                                                                                                                                                                                                                                                                        select
                                                                                                                                                                                                                                                                                                                                                                                p.id as profile_id,
                                                                                                                                                                                                                                                                                                                                                                                        coalesce(p.full_name, 'SoldierHub member')::text as full_name,
                                                                                                                                                                                                                                                                                                                                                                                                coalesce(p.avatar_color, '#314A66')::text as avatar_color,
                                                                                                                                                                                                                                                                                                                                                                                                        p.avatar_url::text as avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                coalesce(p.base, 'Fort Bliss')::text as base,
                                                                                                                                                                                                                                                                                                                                                                                                                        pf.created_at as followed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                null::bigint as total_count
                                                                                                                                                                                                                                                                                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                                                                                                                                                                                                                                                                                            join public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                    on p.id = pf.following_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                          where pf.follower_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  and p.status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and p.verification_status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                order by pf.created_at desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      offset safe_offset
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            limit safe_limit;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                return;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    return query
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        select
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              p.id as profile_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    coalesce(p.full_name, 'SoldierHub member')::text as full_name,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          coalesce(p.avatar_color, '#314A66')::text as avatar_color,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                p.avatar_url::text as avatar_url,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      coalesce(p.base, 'Fort Bliss')::text as base,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            pf.created_at as followed_at,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  null::bigint as total_count
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      from public.profile_follows pf
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          join public.profiles p
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                on p.id = pf.follower_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    where pf.following_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and p.status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                and p.verification_status = 'verified'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    order by pf.created_at desc
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        offset safe_offset
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            limit safe_limit;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            $function$;

set check_function_bodies = on;

commit;
