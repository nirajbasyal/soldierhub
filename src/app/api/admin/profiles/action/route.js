import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "verify",
  "reject",
  "revoke",
  "verify_by_email",
  "revoke_by_email",
]);

function getExpectedAdminEmails() {
  return (process.env.SOLDIERHUB_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createAuthedSupabaseClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function isExpectedAdmin({ user, profile }) {
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

async function runAdminAction({ supabase, action, profileId, email }) {
  if (action === "verify") {
    return supabase
      .from("profiles")
      .update({ verification_status: "verified" })
      .eq("id", profileId)
      .select("id, full_name, email, verification_status")
      .maybeSingle();
  }

  if (action === "reject") {
    return supabase.rpc("admin_reject_profile", { p_profile_id: profileId });
  }

  if (action === "revoke") {
    return supabase.rpc("admin_revoke_profile", { p_profile_id: profileId });
  }

  if (action === "verify_by_email") {
    return supabase.rpc("admin_verify_profile_by_email", { p_email: email });
  }

  return supabase.rpc("admin_revoke_profile_by_email", { p_email: email });
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "admin-profiles-action-ip",
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before using admin actions." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before using admin actions." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `admin-profiles-action-user-${user.id}`,
    limit: 80,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid admin action request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const action = cleanText(requestBody?.action).toLowerCase();
  const profileId = cleanText(requestBody?.profileId || requestBody?.profile_id);
  const email = cleanText(requestBody?.email).toLowerCase();

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Invalid admin action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (["verify", "reject", "revoke"].includes(action) && !profileId) {
    return NextResponse.json(
      { error: "Profile id is required for this admin action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (["verify_by_email", "revoke_by_email"].includes(action) && !email) {
    return NextResponse.json(
      { error: "Email is required for this admin action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("id, email, personal_email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfileError) {
    return NextResponse.json(
      { error: "Could not verify your admin profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!isExpectedAdmin({ user, profile: adminProfile })) {
    return NextResponse.json(
      { error: "Admin access is required for this action." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await runAdminAction({
    supabase,
    action,
    profileId,
    email,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Admin action failed." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: Array.isArray(data) ? data[0] || null : data || null },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
