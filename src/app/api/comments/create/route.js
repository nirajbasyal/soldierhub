import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { checkContentSafety } from "@/lib/server/contentSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 2000;

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

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function validateCommentInput({ postId, body }) {
  if (!postId) return "Post was not identified. Please refresh and try again.";
  if (!body) return "Please write a comment before posting.";
  if (body.length > MAX_COMMENT_LENGTH) return `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`;
  return null;
}

export async function POST(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "comments:create:ip",
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before commenting." },
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
      { error: "Please log in again before commenting." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `comments:create:user:${user.id}`,
    limit: 25,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let bodyJson;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid comment request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const postId = cleanText(bodyJson?.post_id || bodyJson?.postId);
  const body = cleanText(bodyJson?.body);
  const validationError = validateCommentInput({ postId, body });

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const safety = await checkContentSafety(body);
  if (!safety.allowed) {
    return NextResponse.json(
      { error: safety.reason || "This comment could not be submitted." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Create comment profile lookup failed:", profileError);
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before you can comment." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabase.rpc("create_comment_safe", {
    p_post_id: postId,
    p_body: body,
  });

  if (error) {
    console.error("Create comment API failed:", error);
    return NextResponse.json(
      { error: error.message || "Could not create comment." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { comment: Array.isArray(data) ? data[0] || null : data || null },
    { status: 201, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
