import { createClient } from "@supabase/supabase-js";

export function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function createAuthedSupabaseClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function getExpectedAdminEmails() {
  return (process.env.SOLDIERHUB_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isExpectedAdmin({ user, profile }) {
  const expectedEmails = getExpectedAdminEmails();
  if (!expectedEmails.length) return false;

  const authEmail = user?.email?.trim().toLowerCase() || "";
  const profileEmail = profile?.email?.trim().toLowerCase() || "";
  const personalEmail = profile?.personal_email?.trim().toLowerCase() || "";

  return (
    profile?.role === "admin" &&
    expectedEmails.some((expectedEmail) =>
      [authEmail, profileEmail, personalEmail].includes(expectedEmail)
    )
  );
}

export async function requireAdmin(request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { ok: false, status: 401, error: "Please log in again before using admin actions." };
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  if (!supabase) {
    return { ok: false, status: 503, error: "Supabase is not configured." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return { ok: false, status: 401, error: "Please log in again before using admin actions." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, personal_email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: "Could not verify your admin profile." };
  }

  if (!isExpectedAdmin({ user, profile })) {
    return { ok: false, status: 403, error: "Admin access is required." };
  }

  return { ok: true, supabase, user, profile, accessToken };
}
