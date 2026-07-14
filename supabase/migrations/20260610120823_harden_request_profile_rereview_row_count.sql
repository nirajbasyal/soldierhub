CREATE OR REPLACE FUNCTION public.request_profile_rereview(p_phone text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_updated_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to request re-review.';
  END IF;

  UPDATE public.profiles
  SET
    verification_status = 'pending',
    phone = coalesce(nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), ''), phone),
    updated_at = now()
  WHERE id = auth.uid()
    AND verification_status IN ('rejected', 'revoked');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND verification_status = 'pending'
    ) THEN
      UPDATE public.profiles
      SET
        phone = coalesce(nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), ''), phone),
        updated_at = now()
      WHERE id = auth.uid()
        AND verification_status = 'pending';
      RETURN;
    END IF;

    RAISE EXCEPTION 'Re-review is only available for rejected or revoked profiles. Please sign in with the same account and try again.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_profile_rereview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_profile_rereview(text) TO authenticated;
