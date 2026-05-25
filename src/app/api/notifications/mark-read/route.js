import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
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

function getProfileStatus(profile) {
  return profile?.status || profile?.verification_status || "pending";
}

function noStoreHeaders(rateLimitHeaders = {}) {
  return { ...rateLimitHeaders, "Cache-Control": "no-store" };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "notifications-mark-read-ip",
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before updating notifications." },
      { status: 401, headers: noStoreHeaders(ipRateLimit.headers) }
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503, headers: noStoreHeaders(ipRateLimit.headers) }
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before updating notifications." },
      { status: 401, headers: noStoreHeaders(ipRateLimit.headers) }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `notifications-mark-read-user-${user.id}`,
    limit: 80,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: noStoreHeaders(userRateLimit.headers) }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before updating notifications." },
      { status: 403, headers: noStoreHeaders(userRateLimit.headers) }
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_user_id", user.id)
    .eq("read", false);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update notifications." },
      { status: 500, headers: noStoreHeaders(userRateLimit.headers) }
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: noStoreHeaders(userRateLimit.headers) }
  );
}
