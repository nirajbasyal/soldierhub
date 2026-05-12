import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POST_SELECT =
  "id, author_id, author_name_cached, author_color_cached, category, body, anonymous, status, edited, created_at, updated_at";

const MAX_BODY_LENGTH = 5000;

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

function cleanText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function validatePostInput({ body }) {
  if (!body) return "Please write something before posting.";
  if (body.length > MAX_BODY_LENGTH) return `Post body must be ${MAX_BODY_LENGTH} characters or less.`;
  return null;
}

function normalizeCreatedPost(row = {}) {
  return {
    ...row,
    id: row.id,
    post_id: row.id,
    author_name: row.author_name_cached || "Member",
    author_color: row.author_color_cached || "#314A66",
    upvote_count: 0,
    comment_count: 0,
    report_count: 0,
  };
}

export async function POST(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "posts:create:ip",
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before posting." },
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

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before posting." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `posts:create:user:${user.id}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let bodyJson;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid post request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const body = cleanText(bodyJson?.body);
  const category = cleanText(bodyJson?.category, "General Q&A") || "General Q&A";
  const anonymous = Boolean(bodyJson?.anonymous);

  const validationError = validatePostInput({ body });

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_color, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Create post profile lookup failed:", profileError);
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before you can post." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const payload = {
    author_id: user.id,
    author_name_cached: profile.full_name || user.email || "Member",
    author_color_cached: profile.avatar_color || "#314A66",
    category,
    body,
    anonymous,
    status: "active",
    edited: false,
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(payload)
    .select(POST_SELECT)
    .single();

  if (error) {
    console.error("Create post API failed:", error);
    return NextResponse.json(
      { error: error.message || "Could not create post." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { post: normalizeCreatedPost(data) },
    { status: 201, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
