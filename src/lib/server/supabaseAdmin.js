import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase service-role client.
 *
 * Never import this from Client Components. The service-role key must only exist
 * in server runtime environment variables and must never be prefixed with
 * NEXT_PUBLIC_.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getOptionalServiceRoleClient() {
  return createServiceRoleClient();
}

export function getServiceRoleStatus() {
  return createServiceRoleClient() ? "service_role" : "missing";
}
