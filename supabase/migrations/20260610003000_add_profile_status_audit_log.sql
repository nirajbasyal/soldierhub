-- Add audit logging for sensitive profile/admin changes.
-- Purpose: production traceability for profile verification and role changes.
-- Safe: additive only; does not change existing profile behavior.

CREATE TABLE IF NOT EXISTS public.profile_status_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_verification_status text,
  new_verification_status text,
  old_role text,
  new_role text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_status_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS profile_status_audit_log_profile_changed_idx
  ON public.profile_status_audit_log (profile_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS profile_status_audit_log_actor_changed_idx
  ON public.profile_status_audit_log (actor_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS profile_status_audit_log_changed_idx
  ON public.profile_status_audit_log (changed_at DESC);

CREATE OR REPLACE FUNCTION public.tg_audit_profile_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF tg_op = 'UPDATE'
     AND (
       new.verification_status IS DISTINCT FROM old.verification_status
       OR new.role IS DISTINCT FROM old.role
     ) THEN
    INSERT INTO public.profile_status_audit_log (
      profile_id,
      actor_id,
      old_verification_status,
      new_verification_status,
      old_role,
      new_role
    ) VALUES (
      new.id,
      auth.uid(),
      old.verification_status,
      new.verification_status,
      old.role,
      new.role
    );
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_status_changes ON public.profiles;

CREATE TRIGGER audit_profile_status_changes
AFTER UPDATE OF verification_status, role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tg_audit_profile_status_changes();

CREATE POLICY "profile_status_audit_log_admin_select"
  ON public.profile_status_audit_log
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON public.profile_status_audit_log FROM anon, authenticated;
GRANT SELECT ON public.profile_status_audit_log TO authenticated;
GRANT ALL ON public.profile_status_audit_log TO service_role;

COMMENT ON TABLE public.profile_status_audit_log IS 'Audit trail for profile verification status and role changes.';
