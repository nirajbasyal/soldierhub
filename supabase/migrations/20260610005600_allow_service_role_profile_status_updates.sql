-- Allow server-side admin API routes to update profile moderation fields.
-- The Next.js route verifies admin + MFA before using the service_role key.
-- Normal users remain blocked from changing verification_status or role.

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Admin API routes use the service_role key after requireAdmin + MFA.
  -- Allow that server-side path to manage moderation fields.
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Signed-in admins using an authenticated JWT can manage verification/admin fields.
  IF public.is_admin() THEN
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
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_fields() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_sensitive_fields() TO service_role;
