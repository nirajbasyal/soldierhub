-- Stage 2B: remove database dependencies on public.profiles.status.
-- This migration intentionally does NOT drop public.profiles.status.
-- It prepares the database so the final drop can happen after verification.

BEGIN;

-- 1) Keep verification_status fully populated before removing DB dependencies.
UPDATE public.profiles
SET verification_status = COALESCE(verification_status, status, 'pending')
WHERE verification_status IS NULL;

-- 2) Refuse to continue if the compatibility columns have drifted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE status IS DISTINCT FROM verification_status
  ) THEN
    RAISE EXCEPTION 'Stage 2B blocked: public.profiles.status and public.profiles.verification_status are not fully synced.';
  END IF;
END $$;

-- 3) Core verification helpers: verification_status is the only profile verification source of truth.
CREATE OR REPLACE FUNCTION public.is_verified_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.verification_status = 'verified'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.verification_status = 'verified'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.verification_status = 'verified'
  );
$function$;

-- 4) Admin queue/list functions.
-- Keep legacy RPC output column named "status" for backward compatibility,
-- but derive it from verification_status instead of public.profiles.status.
CREATE OR REPLACE FUNCTION public.admin_list_profiles(p_queue text DEFAULT 'pending'::text, p_limit integer DEFAULT 50)
RETURNS TABLE(
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_queue text := lower(trim(coalesce(p_queue, 'pending')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please log in again before loading admin profiles.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access is required to load profile queues.';
  END IF;

  IF v_queue NOT IN ('pending', 'verified', 'blocked') THEN
    RAISE EXCEPTION 'Invalid admin profile queue.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.personal_email,
    p.phone,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.role,
    p.verification_status AS status,
    p.verification_status,
    p.base,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE
    (v_queue = 'pending' AND p.verification_status = 'pending')
    OR (v_queue = 'verified' AND p.verification_status = 'verified')
    OR (v_queue = 'blocked' AND p.verification_status IN ('rejected', 'revoked'))
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT v_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_profile(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can reject profiles.';
  END IF;

  UPDATE public.profiles
  SET
    verification_status = 'rejected',
    updated_at = now()
  WHERE id = p_profile_id
    AND verification_status = 'pending';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_profile(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can revoke profiles.';
  END IF;

  UPDATE public.profiles
  SET
    verification_status = 'revoked',
    updated_at = now()
  WHERE id = p_profile_id
    AND verification_status = 'verified';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_verify_profile_by_email(p_email text)
RETURNS TABLE(id uuid, email text, personal_email text, full_name text, status text, verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can verify profiles.';
  END IF;

  RETURN QUERY
  UPDATE public.profiles
  SET
    verification_status = 'verified',
    updated_at = now()
  WHERE lower(coalesce(profiles.email, profiles.personal_email)) = lower(p_email)
     OR lower(profiles.personal_email) = lower(p_email)
  RETURNING
    profiles.id,
    profiles.email,
    profiles.personal_email,
    profiles.full_name,
    profiles.verification_status AS status,
    profiles.verification_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_profile_by_email(p_email text)
RETURNS TABLE(id uuid, email text, personal_email text, full_name text, status text, verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can revoke profiles.';
  END IF;

  RETURN QUERY
  UPDATE public.profiles
  SET
    verification_status = 'revoked',
    updated_at = now()
  WHERE (
      lower(coalesce(profiles.email, profiles.personal_email)) = lower(p_email)
      OR lower(profiles.personal_email) = lower(p_email)
    )
    AND coalesce(profiles.role, 'user') <> 'admin'
  RETURNING
    profiles.id,
    profiles.email,
    profiles.personal_email,
    profiles.full_name,
    profiles.verification_status AS status,
    profiles.verification_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_profile_rereview(p_phone text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to request re-review.';
  END IF;

  UPDATE public.profiles
  SET
    verification_status = 'pending',
    phone = coalesce(nullif(p_phone, ''), phone),
    updated_at = now()
  WHERE id = auth.uid()
    AND verification_status IN ('rejected', 'revoked');
END;
$function$;

-- 5) Signup trigger function no longer inserts legacy status.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    personal_email,
    full_name,
    phone,
    bio,
    avatar_color,
    base,
    role,
    verification_status,
    created_at,
    updated_at
  ) VALUES (
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
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    personal_email = excluded.personal_email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    bio = excluded.bio,
    avatar_color = excluded.avatar_color,
    updated_at = now();

  RETURN new;
END;
$function$;

-- 6) Public profile RPCs: verification_status-only visibility checks.
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  bio text,
  avatar_color text,
  avatar_url text,
  role text,
  status text,
  verification_status text,
  base text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.full_name,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    null::text AS role,
    null::text AS status,
    null::text AS verification_status,
    p.base,
    p.created_at
  FROM public.profiles p
  WHERE p.id = p_user_id
    AND p.verification_status = 'verified'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profiles_for_ids(p_user_ids uuid[])
RETURNS TABLE(
  id uuid,
  full_name text,
  bio text,
  avatar_color text,
  avatar_url text,
  base text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH safe_ids AS (
    SELECT DISTINCT user_id
    FROM unnest(coalesce(p_user_ids, array[]::uuid[])) AS user_id
    WHERE user_id IS NOT NULL
    LIMIT 100
  )
  SELECT
    p.id,
    p.full_name,
    p.bio,
    p.avatar_color,
    p.avatar_url,
    p.base,
    p.created_at
  FROM safe_ids s
  JOIN public.profiles p
    ON p.id = s.user_id
  WHERE p.verification_status = 'verified';
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_follow_summary(p_profile_id uuid)
RETURNS TABLE(profile_id uuid, followers_count bigint, following_count bigint, is_following boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH target_profile AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.verification_status = 'verified'
    LIMIT 1
  )
  SELECT
    target_profile.id AS profile_id,
    coalesce((
      SELECT count(*)
      FROM public.profile_follows pf
      WHERE pf.following_id = target_profile.id
        AND EXISTS (
          SELECT 1
          FROM public.profiles follower_profile
          WHERE follower_profile.id = pf.follower_id
            AND follower_profile.verification_status = 'verified'
        )
    ), 0)::bigint AS followers_count,
    coalesce((
      SELECT count(*)
      FROM public.profile_follows pf
      WHERE pf.follower_id = target_profile.id
        AND EXISTS (
          SELECT 1
          FROM public.profiles following_profile
          WHERE following_profile.id = pf.following_id
            AND following_profile.verification_status = 'verified'
        )
    ), 0)::bigint AS following_count,
    CASE
      WHEN auth.uid() IS NULL OR auth.uid() = target_profile.id THEN false
      ELSE EXISTS (
        SELECT 1
        FROM public.profile_follows pf
        WHERE pf.follower_id = auth.uid()
          AND pf.following_id = target_profile.id
      )
    END AS is_following
  FROM target_profile;
$function$;

CREATE OR REPLACE FUNCTION public.list_my_follow_connections(p_list_type text DEFAULT 'followers'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text, followed_at timestamp with time zone, total_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_verified_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Verified account required';
  END IF;

  IF lower(coalesce(p_list_type, 'followers')) = 'following' THEN
    RETURN QUERY
    SELECT
      p.id AS profile_id,
      coalesce(p.full_name, 'SoldierHub member')::text AS full_name,
      coalesce(p.avatar_color, '#314A66')::text AS avatar_color,
      p.avatar_url::text AS avatar_url,
      coalesce(p.base, 'Fort Bliss')::text AS base,
      pf.created_at AS followed_at,
      null::bigint AS total_count
    FROM public.profile_follows pf
    JOIN public.profiles p
      ON p.id = pf.following_id
    WHERE pf.follower_id = auth.uid()
      AND p.verification_status = 'verified'
    ORDER BY pf.created_at DESC
    OFFSET safe_offset
    LIMIT safe_limit;

    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS profile_id,
    coalesce(p.full_name, 'SoldierHub member')::text AS full_name,
    coalesce(p.avatar_color, '#314A66')::text AS avatar_color,
    p.avatar_url::text AS avatar_url,
    coalesce(p.base, 'Fort Bliss')::text AS base,
    pf.created_at AS followed_at,
    null::bigint AS total_count
  FROM public.profile_follows pf
  JOIN public.profiles p
    ON p.id = pf.follower_id
  WHERE pf.following_id = auth.uid()
    AND p.verification_status = 'verified'
  ORDER BY pf.created_at DESC
  OFFSET safe_offset
  LIMIT safe_limit;
END;
$function$;

-- 7) Profile/email search RPCs.
CREATE OR REPLACE FUNCTION public.search_verified_profile_by_email(p_email text)
RETURNS TABLE(profile_id uuid, full_name text, avatar_color text, avatar_url text, base text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF clean_email = '' OR clean_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Valid email required';
  END IF;

  IF NOT public.is_verified_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Verified account required';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS profile_id,
    coalesce(p.full_name, 'SoldierHub member')::text AS full_name,
    coalesce(p.avatar_color, '#314A66')::text AS avatar_color,
    p.avatar_url::text AS avatar_url,
    coalesce(p.base, 'Fort Bliss')::text AS base
  FROM public.profiles p
  WHERE (
    lower(coalesce(p.email, '')) = clean_email
    OR lower(coalesce(p.personal_email, '')) = clean_email
  )
    AND p.verification_status = 'verified'
  ORDER BY p.created_at ASC
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_verified_profile_by_email(p_email text)
RETURNS TABLE(id uuid, full_name text, avatar_color text, avatar_url text, base text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in before searching member profiles.';
  END IF;

  IF NOT public.is_verified_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Verified account required to search member profiles.';
  END IF;

  IF clean_email = '' OR position('@' in clean_email) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    coalesce(p.full_name, 'SoldierHub member')::text AS full_name,
    coalesce(p.avatar_color, '#314A66')::text AS avatar_color,
    p.avatar_url::text AS avatar_url,
    coalesce(p.base, 'Fort Bliss')::text AS base
  FROM public.profiles p
  WHERE p.verification_status = 'verified'
    AND (
      lower(coalesce(p.email, '')) = clean_email
      OR lower(coalesce(p.personal_email, '')) = clean_email
    )
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_verified_profiles(p_query text, p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, full_name text, avatar_color text, avatar_url text, base text, match_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_query text := trim(coalesce(p_query, ''));
  clean_query_lower text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 8), 1), 25);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  looks_like_email boolean := trim(coalesce(p_query, '')) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in before searching member profiles.';
  END IF;

  IF NOT public.is_verified_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Verified account required to search member profiles.';
  END IF;

  IF length(clean_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    coalesce(p.full_name, 'SoldierHub member')::text AS full_name,
    coalesce(p.avatar_color, '#314A66')::text AS avatar_color,
    p.avatar_url::text AS avatar_url,
    coalesce(p.base, 'Fort Bliss')::text AS base,
    CASE
      WHEN looks_like_email AND lower(coalesce(p.email, '')) = clean_query_lower THEN 'email'
      ELSE 'name'
    END::text AS match_type
  FROM public.profiles p
  WHERE p.verification_status = 'verified'
    AND (
      (p.full_name IS NOT NULL AND lower(p.full_name) LIKE clean_query_lower || '%')
      OR (looks_like_email AND p.email IS NOT NULL AND lower(p.email) = clean_query_lower)
    )
  ORDER BY
    CASE WHEN looks_like_email AND lower(coalesce(p.email, '')) = clean_query_lower THEN 0 ELSE 1 END,
    CASE WHEN lower(coalesce(p.full_name, '')) = clean_query_lower THEN 0 ELSE 1 END,
    p.full_name ASC,
    p.updated_at DESC NULLS LAST,
    p.created_at DESC NULLS LAST
  OFFSET safe_offset
  LIMIT safe_limit;
END;
$function$;

-- 8) Post/comment/feed RPCs that should keep posts.status but stop checking profile status.
CREATE OR REPLACE FUNCTION public.create_comment_safe(p_post_id uuid, p_body text)
RETURNS TABLE(
  id uuid,
  comment_id uuid,
  post_id uuid,
  body text,
  created_at timestamp with time zone,
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_comment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to comment.';
  END IF;

  IF NOT public.is_verified_profile(v_user_id) THEN
    RAISE EXCEPTION 'Your profile must be verified before you can comment.';
  END IF;

  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Post was not identified.';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Please write a comment before posting.';
  END IF;

  IF length(trim(p_body)) > 2000 THEN
    RAISE EXCEPTION 'Comment must be 2000 characters or less.';
  END IF;

  INSERT INTO public.comments (post_id, author_id, body)
  VALUES (p_post_id, v_user_id, trim(p_body))
  RETURNING comments.id INTO v_comment_id;

  RETURN QUERY
  SELECT gc.*
  FROM public.get_public_comments_for_post(p_post_id, 100) gc
  WHERE gc.id = v_comment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_comment_safe(p_comment_id uuid)
RETURNS TABLE(ok boolean, deleted_comment_id uuid, affected_post_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_comment record;
  v_is_verified boolean := false;
  v_is_admin boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please log in again before deleting this comment.' USING errcode = '28000';
  END IF;

  SELECT public.is_verified_profile(v_user_id) INTO v_is_verified;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Your profile must be verified before deleting comments.' USING errcode = '42501';
  END IF;

  SELECT public.is_admin() INTO v_is_admin;

  SELECT c.id, c.post_id, c.author_id, c.deleted_at
  INTO v_comment
  FROM public.comments c
  WHERE c.id = p_comment_id
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'This comment no longer exists.' USING errcode = 'P0002';
  END IF;

  IF v_comment.deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT true, v_comment.id, v_comment.post_id;
    RETURN;
  END IF;

  IF v_comment.author_id <> v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'You can only delete your own comment.' USING errcode = '42501';
  END IF;

  UPDATE public.comments
  SET
    deleted_at = now(),
    deleted_by = v_user_id,
    deleted_reason = CASE
      WHEN v_is_admin AND v_comment.author_id <> v_user_id THEN 'admin_deleted'
      ELSE 'user_deleted'
    END,
    body = '[deleted]'
  WHERE id = p_comment_id
    AND deleted_at IS NULL;

  DELETE FROM public.notifications
  WHERE comment_id = p_comment_id;

  RETURN QUERY SELECT true, v_comment.id, v_comment.post_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_public_posts_by_author(
  p_profile_id uuid,
  p_limit integer DEFAULT 30,
  p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_cursor_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid,
  author_id uuid,
  category text,
  body text,
  anonymous boolean,
  status text,
  edited boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_name text,
  author_color text,
  author_avatar_url text,
  upvote_count bigint,
  comment_count bigint,
  report_count bigint,
  image_url text,
  image_key text,
  image_width integer,
  image_height integer,
  image_size integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.author_id,
    p.category,
    p.body,
    p.anonymous,
    p.status,
    p.edited,
    p.created_at,
    p.updated_at,
    coalesce(p.author_name_cached, pr.full_name, 'Member') AS author_name,
    coalesce(p.author_color_cached, pr.avatar_color, '#314A66') AS author_color,
    pr.avatar_url AS author_avatar_url,
    coalesce((
      SELECT count(*)
      FROM public.upvotes u
      WHERE u.post_id = p.id
    ), 0)::bigint AS upvote_count,
    coalesce((
      SELECT count(*)
      FROM public.comments c
      WHERE c.post_id = p.id
        AND c.deleted_at IS NULL
    ), 0)::bigint AS comment_count,
    (
      coalesce((
        SELECT count(*)
        FROM public.reports r
        WHERE r.post_id = p.id
      ), 0)
      +
      coalesce((
        SELECT count(*)
        FROM public.visitor_reports vr
        WHERE vr.post_id = p.id
      ), 0)
    )::bigint AS report_count,
    p.image_url,
    p.image_key,
    p.image_width,
    p.image_height,
    p.image_size
  FROM public.posts p
  JOIN public.profiles pr
    ON pr.id = p.author_id
  WHERE p.author_id = p_profile_id
    AND p.anonymous IS FALSE
    AND p.status IN ('active', 'reported')
    AND pr.verification_status = 'verified'
    AND (
      p_cursor_created_at IS NULL
      OR p_cursor_id IS NULL
      OR (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT greatest(1, least(coalesce(p_limit, 30), 50));
$function$;

CREATE OR REPLACE FUNCTION public.list_my_notifications_hydrated(
  p_limit integer DEFAULT 30,
  p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_cursor_id uuid DEFAULT NULL::uuid,
  p_notification_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE(
  id uuid,
  recipient_user_id uuid,
  actor_user_id uuid,
  actor_id uuid,
  actor_name_cached text,
  actor_color_cached text,
  actor_avatar_url text,
  type text,
  post_id uuid,
  comment_id uuid,
  read boolean,
  created_at timestamp with time zone,
  post_title_cached text,
  post_preview_cached text,
  comment_body_cached text,
  post jsonb,
  comment jsonb,
  actor_profile jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  safe_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
  safe_notification_ids uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.is_verified_profile(v_user_id) THEN
    RETURN;
  END IF;

  IF p_notification_ids IS NOT NULL THEN
    SELECT array_agg(notification_id)
      INTO safe_notification_ids
    FROM (
      SELECT DISTINCT notification_id
      FROM unnest(p_notification_ids) AS notification_id
      WHERE notification_id IS NOT NULL
      LIMIT 50
    ) ids;

    IF safe_notification_ids IS NULL OR array_length(safe_notification_ids, 1) IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH selected_notifications AS (
    SELECT n.*
    FROM public.notifications n
    WHERE n.recipient_user_id = v_user_id
      AND (
        safe_notification_ids IS NULL
        OR n.id = any(safe_notification_ids)
      )
      AND (
        safe_notification_ids IS NOT NULL
        OR p_cursor_created_at IS NULL
        OR p_cursor_id IS NULL
        OR (n.created_at, n.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT safe_limit
  )
  SELECT
    n.id,
    n.recipient_user_id,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN null
      ELSE resolved.actor_id
    END AS actor_user_id,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN null
      ELSE resolved.actor_id
    END AS actor_id,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN 'Anonymous'
      ELSE coalesce(ap.full_name, n.actor_name_cached, 'Someone')
    END::text AS actor_name_cached,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN '#5C6470'
      ELSE coalesce(ap.avatar_color, '#314A66')
    END::text AS actor_color_cached,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN null
      ELSE ap.avatar_url
    END::text AS actor_avatar_url,
    n.type,
    coalesce(n.post_id, c.post_id) AS post_id,
    n.comment_id,
    n.read,
    n.created_at,
    coalesce(nullif(n.post_title_cached, ''), left(coalesce(p.body, ''), 180), '')::text AS post_title_cached,
    coalesce(left(coalesce(p.body, n.post_title_cached, ''), 220), '')::text AS post_preview_cached,
    coalesce(c.body, '')::text AS comment_body_cached,
    CASE
      WHEN p.id IS NULL THEN null
      ELSE jsonb_strip_nulls(jsonb_build_object(
        'id', p.id,
        'post_id', p.id,
        'body', p.body,
        'category', p.category,
        'anonymous', p.anonymous,
        'status', p.status,
        'created_at', p.created_at,
        'author_id', CASE WHEN p.anonymous THEN null ELSE p.author_id END,
        'author_name', CASE WHEN p.anonymous THEN null ELSE p.author_name_cached END,
        'author_color', CASE WHEN p.anonymous THEN null ELSE p.author_color_cached END,
        'image_url', p.image_url,
        'image_key', p.image_key,
        'image_width', p.image_width,
        'image_height', p.image_height,
        'image_size', p.image_size
      ))
    END AS post,
    CASE
      WHEN c.id IS NULL THEN null
      ELSE jsonb_strip_nulls(jsonb_build_object(
        'id', c.id,
        'comment_id', c.id,
        'post_id', c.post_id,
        'body', c.body,
        'created_at', c.created_at,
        'author_id', CASE WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN null ELSE c.author_id END,
        'author_name_cached', CASE WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN 'Anonymous' ELSE coalesce(cp.full_name, c.author_name_cached, 'Member') END,
        'author_color_cached', CASE WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN '#5C6470' ELSE coalesce(cp.avatar_color, c.author_color_cached, '#314A66') END,
        'author_avatar_url', CASE WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN null ELSE cp.avatar_url END,
        'is_anonymous_author', (p.anonymous IS TRUE AND c.author_id = p.author_id)
      ))
    END AS comment,
    CASE
      WHEN resolved.actor_id IS NULL THEN null
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN null
      ELSE jsonb_strip_nulls(jsonb_build_object(
        'id', ap.id,
        'full_name', ap.full_name,
        'avatar_color', ap.avatar_color,
        'avatar_url', ap.avatar_url,
        'base', ap.base
      ))
    END AS actor_profile
  FROM selected_notifications n
  LEFT JOIN public.comments c
    ON c.id = n.comment_id
   AND c.deleted_at IS NULL
   AND coalesce(nullif(trim(c.body), ''), '') <> ''
   AND lower(trim(c.body)) <> '[deleted]'
  LEFT JOIN public.posts p
    ON p.id = coalesce(n.post_id, c.post_id)
  LEFT JOIN LATERAL (
    SELECT CASE
      WHEN n.type = 'comment' AND c.author_id IS NOT NULL THEN c.author_id
      ELSE n.actor_user_id
    END AS actor_id
  ) resolved ON true
  LEFT JOIN public.profiles ap
    ON ap.id = resolved.actor_id
  LEFT JOIN public.profiles cp
    ON cp.id = c.author_id
  ORDER BY n.created_at DESC, n.id DESC;
END;
$function$;

-- 9) Views are recreated as verification_status-only. They are already safe in current live DB,
-- but this keeps the migration self-contained and rebuild-friendly.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  bio,
  avatar_color,
  avatar_url,
  base,
  created_at
FROM public.profiles
WHERE verification_status = 'verified';

CREATE OR REPLACE VIEW public.profile_follow_counts AS
SELECT
  p.id AS profile_id,
  coalesce(followers.followers_count, 0::bigint) AS followers_count,
  coalesce(following.following_count, 0::bigint) AS following_count
FROM public.profiles p
LEFT JOIN (
  SELECT following_id, count(*) AS followers_count
  FROM public.profile_follows
  GROUP BY following_id
) followers ON followers.following_id = p.id
LEFT JOIN (
  SELECT follower_id, count(*) AS following_count
  FROM public.profile_follows
  GROUP BY follower_id
) following ON following.follower_id = p.id
WHERE p.verification_status = 'verified';

-- 10) Replace profile indexes so no index depends on public.profiles.status.
DROP INDEX IF EXISTS public.profiles_status_created_idx;
DROP INDEX IF EXISTS public.profiles_status_created_at_idx;
DROP INDEX IF EXISTS public.profiles_verified_lookup_idx;
DROP INDEX IF EXISTS public.profiles_verified_email_lower_idx;
DROP INDEX IF EXISTS public.profiles_verified_personal_email_lower_idx;

CREATE INDEX IF NOT EXISTS profiles_verification_status_created_idx
ON public.profiles (verification_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS profiles_verification_status_role_idx
ON public.profiles (verification_status, role, id);

CREATE INDEX IF NOT EXISTS profiles_verified_lookup_idx
ON public.profiles (id)
WHERE verification_status = 'verified';

CREATE INDEX IF NOT EXISTS profiles_verified_email_lower_idx
ON public.profiles (lower(email))
WHERE verification_status = 'verified';

CREATE INDEX IF NOT EXISTS profiles_verified_personal_email_lower_idx
ON public.profiles (lower(personal_email))
WHERE verification_status = 'verified';

-- 11) Keep the Stage 1 mirror trigger/function for now. It is removed in the final drop migration.
-- Final pre-drop proof query should show no non-internal dependencies on public.profiles.status.

COMMIT;
