-- Soldier Hub
-- Migration: Latest public post marker for lightweight feed polling
-- Purpose:
--   Lets the frontend check whether a newer public feed post exists without
--   opening a Supabase realtime subscription for every feed visitor.

CREATE OR REPLACE FUNCTION public.get_latest_public_post_marker()
RETURNS TABLE (
  id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.created_at
  FROM public.posts p
  WHERE p.status IN ('active', 'reported')
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_latest_public_post_marker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_public_post_marker() TO anon, authenticated;
