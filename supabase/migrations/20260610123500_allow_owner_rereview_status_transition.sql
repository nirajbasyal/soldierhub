-- Allow the explicit re-review workflow while keeping normal profile settings locked down.
-- Normal users still cannot change verification_status or phone from profile settings.
-- This only allows the signed-in owner to move their own rejected/revoked profile back to pending.

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Admin API routes use the service_role key after requireAdmin + MFA.
  -- Allow that server-side path to manage moderation fields.
  IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Signed-in admins using an authenticated JWT can manage verification/admin fields.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Safe self-service re-review transition only:
  -- a signed-in owner can move their own rejected/revoked profile back to pending,
  -- and may add/update phone at the same time. This keeps profile settings from
  -- changing verification status while allowing the explicit re-review workflow.
  IF auth.uid() = OLD.id
    AND NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW.email IS NOT DISTINCT FROM OLD.email
    AND NEW.personal_email IS NOT DISTINCT FROM OLD.personal_email
    AND NEW.role IS NOT DISTINCT FROM OLD.role
    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
    AND OLD.verification_status IN ('rejected', 'revoked')
    AND NEW.verification_status = 'pending'
  THEN
    RETURN NEW;
  END IF;

  -- Normal users cannot change identity, verification, or admin-controlled fields.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile ID cannot be changed.';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email cannot be changed from profile settings.';
  END IF;

  IF NEW.personal_email IS DISTINCT FROM OLD.personal_email THEN
    RAISE EXCEPTION 'Personal email cannot be changed from profile settings.';
  END IF;

  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    RAISE EXCEPTION 'Phone number cannot be changed from profile settings.';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role cannot be changed from profile settings.';
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Verification status cannot be changed from profile settings.';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Created date cannot be changed.';
  END IF;

  RETURN NEW;
END;
$function$;
