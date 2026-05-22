-- Return profile avatar URLs from comment RPCs so feed replies do not fall back to initials.
-- Paste this same file into the Supabase SQL Editor, then run it.

DROP FUNCTION IF EXISTS public.get_public_comments_for_post(uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_comments_for_post(uuid);
DROP FUNCTION IF EXISTS public.get_public_comments_for_posts(uuid[], integer);
DROP FUNCTION IF EXISTS public.create_comment_safe(uuid, text);

CREATE OR REPLACE FUNCTION public.get_public_comments_for_post(
  target_post_id uuid,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.id AS comment_id,
    c.post_id,
    c.body,
    c.created_at,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
      ELSE c.author_id
    END AS author_id,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
      ELSE c.author_id
    END AS author_user_id,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN 'Anonymous'
      ELSE COALESCE(pr.full_name, 'Member')
    END AS author_name_cached,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN '#5C6470'
      ELSE pr.avatar_color
    END AS author_color_cached,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
      ELSE pr.avatar_url
    END AS author_avatar_url,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
      ELSE pr.avatar_url
    END AS author_avatar_url_cached,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
      ELSE pr.avatar_url
    END AS profile_avatar_url,
    CASE
      WHEN p.anonymous IS TRUE AND c.author_id = p.author_id THEN NULL
      ELSE pr.avatar_url
    END AS avatar_url,
    (p.anonymous IS TRUE AND c.author_id = p.author_id) AS is_anonymous_author,
    (auth.uid() IS NOT NULL AND c.author_id = auth.uid()) AS viewer_is_author
  FROM public.comments c
  JOIN public.posts p ON p.id = c.post_id
  LEFT JOIN public.profiles pr ON pr.id = c.author_id
  WHERE c.post_id = target_post_id
    AND COALESCE(NULLIF(TRIM(c.body), ''), '') <> ''
    AND LOWER(TRIM(c.body)) <> '[deleted]'
  ORDER BY c.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(limit_count, 50), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_public_comments_for_posts(
  target_post_ids uuid[],
  per_post_limit integer DEFAULT 50
)
RETURNS TABLE (
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked_comments AS (
    SELECT
      c.*,
      p.anonymous AS post_is_anonymous,
      p.author_id AS post_author_id,
      pr.full_name AS profile_full_name,
      pr.avatar_color AS profile_avatar_color,
      pr.avatar_url AS profile_avatar_url,
      ROW_NUMBER() OVER (PARTITION BY c.post_id ORDER BY c.created_at ASC) AS rn
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    LEFT JOIN public.profiles pr ON pr.id = c.author_id
    WHERE c.post_id = ANY(target_post_ids)
      AND COALESCE(NULLIF(TRIM(c.body), ''), '') <> ''
      AND LOWER(TRIM(c.body)) <> '[deleted]'
  )
  SELECT
    rc.id,
    rc.id AS comment_id,
    rc.post_id,
    rc.body,
    rc.created_at,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
      ELSE rc.author_id
    END AS author_id,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
      ELSE rc.author_id
    END AS author_user_id,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN 'Anonymous'
      ELSE COALESCE(rc.profile_full_name, 'Member')
    END AS author_name_cached,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN '#5C6470'
      ELSE rc.profile_avatar_color
    END AS author_color_cached,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
      ELSE rc.profile_avatar_url
    END AS author_avatar_url,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
      ELSE rc.profile_avatar_url
    END AS author_avatar_url_cached,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
      ELSE rc.profile_avatar_url
    END AS profile_avatar_url,
    CASE
      WHEN rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id THEN NULL
      ELSE rc.profile_avatar_url
    END AS avatar_url,
    (rc.post_is_anonymous IS TRUE AND rc.author_id = rc.post_author_id) AS is_anonymous_author,
    (auth.uid() IS NOT NULL AND rc.author_id = auth.uid()) AS viewer_is_author
  FROM ranked_comments rc
  WHERE rc.rn <= LEAST(GREATEST(COALESCE(per_post_limit, 50), 1), 100)
  ORDER BY rc.post_id, rc.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.create_comment_safe(
  p_post_id uuid,
  p_body text
)
RETURNS TABLE (
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_comment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to comment.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND COALESCE(p.status, p.verification_status, 'pending') = 'verified'
  ) THEN
    RAISE EXCEPTION 'Your profile must be verified before you can comment.';
  END IF;

  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Post was not identified.';
  END IF;

  IF p_body IS NULL OR LENGTH(TRIM(p_body)) = 0 THEN
    RAISE EXCEPTION 'Please write a comment before posting.';
  END IF;

  IF LENGTH(TRIM(p_body)) > 2000 THEN
    RAISE EXCEPTION 'Comment must be 2000 characters or less.';
  END IF;

  INSERT INTO public.comments (post_id, author_id, body)
  VALUES (p_post_id, v_user_id, TRIM(p_body))
  RETURNING comments.id INTO v_comment_id;

  RETURN QUERY
  SELECT *
  FROM public.get_public_comments_for_post(p_post_id, 100)
  WHERE get_public_comments_for_post.id = v_comment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_comments_for_post(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_comments_for_posts(uuid[], integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_comment_safe(uuid, text) TO authenticated;
