-- Stage 2B pending migration: drop legacy public.profiles.status after code deployment.
--
-- IMPORTANT:
-- Do not apply this file until the deployed app no longer selects, filters, or writes
-- public.profiles.status. This file is intentionally stored outside supabase/migrations
-- so it cannot be applied by accident during a normal `supabase db push`.
--
-- Preflight checks before applying manually:
--   1. Confirm Vercel has deployed the Stage 2A app code.
--   2. Search the repo for profile status usage:
--        status, verification_status
--        profiles.status
--        .select("id, status
--        .select("id,status
--        .eq("status"
--        .in("status"
--   3. Confirm live database objects no longer depend on public.profiles.status.
--   4. Confirm this returns zero before drop:
--        SELECT COUNT(*) FROM public.profiles WHERE status IS DISTINCT FROM verification_status;

BEGIN;

-- Keep verification_status fully populated before removing the compatibility mirror.
UPDATE public.profiles
SET verification_status = COALESCE(verification_status, status, 'pending')
WHERE verification_status IS NULL;

-- Refuse to continue if the mirror drifted after Stage 1.
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

-- Remove Stage 1 mirror trigger/function if they still exist.
DROP TRIGGER IF EXISTS sync_profile_status_columns_before_write ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_status_columns();

-- Final cleanup: verification_status becomes the only profile verification state column.
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS status;

COMMIT;
