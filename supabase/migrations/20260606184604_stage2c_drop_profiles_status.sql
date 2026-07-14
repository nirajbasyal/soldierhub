-- Stage 2C: Finalize profile verification status consolidation.
-- This migration is intentionally idempotent because the live column was already removed during the approved cleanup.

DROP TRIGGER IF EXISTS trg_sync_profile_verification_status ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_verification_status();

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS status;

COMMENT ON COLUMN public.profiles.verification_status IS
'Canonical profile verification state. Allowed values: pending, verified, rejected, revoked.';
