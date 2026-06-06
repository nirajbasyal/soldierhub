-- Stage 2C pending migration: drop legacy public.profiles.status after Stage 2B verification.
--
-- IMPORTANT:
-- Do not apply this file until:
--   1. Vercel has deployed the Stage 2A/2B app code.
--   2. supabase/migrations/20260606200000_stage2b_remove_profiles_status_dependencies.sql
--      has been applied successfully to production.
--   3. Admin verify/reject/revoke, login, pending review, create post, comment,
--      follow/unfollow, notifications, and uploads have been smoke-tested.
--
-- This file intentionally stays outside supabase/migrations until the final drop is approved.

BEGIN;

-- Keep verification_status fully populated before removing the compatibility mirror.
UPDATE public.profiles
SET verification_status = COALESCE(verification_status, status, 'pending')
WHERE verification_status IS NULL;

-- Refuse to continue if the compatibility columns drifted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE status IS DISTINCT FROM verification_status
  ) THEN
    RAISE EXCEPTION 'Cannot drop public.profiles.status: status and verification_status are not fully synced.';
  END IF;
END $$;

-- Remove the Stage 1 compatibility mirror before dropping the old column.
DROP TRIGGER IF EXISTS trg_sync_profile_verification_status ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_verification_status();

-- Defensive cleanup for any old profile-status indexes that might still exist in older environments.
DROP INDEX IF EXISTS public.profiles_status_created_idx;
DROP INDEX IF EXISTS public.profiles_status_created_at_idx;

-- Final cleanup: verification_status becomes the only profile verification state column.
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS status;

COMMIT;
