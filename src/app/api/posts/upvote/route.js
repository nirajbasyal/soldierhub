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

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "posts-upvote-ip",
    limit: 90,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before voting." },
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
      { error: "Please log in again before voting." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `posts-upvote-user-${user.id}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid vote request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const postId = cleanText(requestBody?.post_id || requestBody?.postId);
  const action = cleanText(requestBody?.action).toLowerCase();

  if (!postId) {
    return NextResponse.json(
      { error: "Post was not identified. Please refresh and try again." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (action !== "add" && action !== "remove") {
    return NextResponse.json(
      { error: "Invalid vote action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before voting." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (action === "remove") {
    const { data, error } = await supabase
      .from("upvotes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .select("post_id, user_id");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not remove vote." },
        { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { action: "remove", removed: Array.isArray(data) ? data.length > 0 : false },
      { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: existingVote } = await supabase
    .from("upvotes")
    .select("post_id, user_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVote) {
    return NextResponse.json(
      { action: "add", upvote: existingVote, already_upvoted: true },
      { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabase
    .from("upvotes")
    .insert([{ post_id: postId, user_id: user.id }])
    .select("post_id, user_id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { action: "add", upvote: null, already_upvoted: true },
        { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: error.message || "Could not add vote." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { action: "add", upvote: data, already_upvoted: false },
    { status: 201, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
