import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

function normalizeStatus(profile = {}) {
  return profile.status || profile.verification_status || "pending";
}

function safeProfilePayload(profile = {}) {
  return {
    id: profile.id || profile.profile_id,
    full_name: profile.full_name || "SoldierHub member",
    avatar_color: profile.avatar_color || "#314A66",
    avatar_url: profile.avatar_url || null,
    base: profile.base || "Fort Bliss",
  };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "profile-email-search-ip",
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before searching profiles." },
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
      { error: "Please log in again before searching profiles." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `profile-email-search-user-${user.id}`,
    limit: 40,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid search request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const email = cleanEmail(requestBody?.email);

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: viewerProfile, error: viewerProfileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (viewerProfileError) {
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (normalizeStatus(viewerProfile) !== "verified") {
    return NextResponse.json(
      { error: "Verified account required to search member profiles." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: searchedProfiles, error: profileError } = await supabase.rpc(
    "search_verified_profile_by_email",
    { p_email: email }
  );

  if (profileError) {
    const message = String(profileError.message || "").toLowerCase();

    return NextResponse.json(
      {
        error: message.includes("function") || message.includes("does not exist")
          ? "Profile search is not ready yet. Please run the latest Supabase SQL migration."
          : "Could not search profiles. Please try again.",
      },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const matchedProfile = Array.isArray(searchedProfiles) ? searchedProfiles[0] : null;

  if (!matchedProfile?.profile_id && !matchedProfile?.id) {
    return NextResponse.json(
      { error: "User not found." },
      { status: 404, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: safeProfilePayload(matchedProfile) },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
