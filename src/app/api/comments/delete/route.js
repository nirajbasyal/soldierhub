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

function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getProfileStatus(profile) {
  return profile?.status || profile?.verification_status || "pending";
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "comments:delete:ip",
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before deleting this comment." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  const serviceSupabase = createServiceSupabaseClient();

  if (!supabase || !serviceSupabase) {
    return NextResponse.json(
      { error: "Supabase delete service is not configured." },
      { status: 503, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before deleting this comment." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `comments:delete:user:${user.id}`,
    limit: 35,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let bodyJson;

  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid delete comment request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const commentId = cleanText(bodyJson?.comment_id || bodyJson?.commentId);

  if (!commentId) {
    return NextResponse.json(
      { error: "Comment was not identified. Please refresh and try again." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Delete comment profile lookup failed:", profileError);
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before deleting comments." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: comment, error: commentError } = await serviceSupabase
    .from("comments")
    .select("id, post_id, author_id")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    console.error("Delete comment lookup failed:", commentError);
    return NextResponse.json(
      { error: "Could not find this comment." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!comment) {
    return NextResponse.json(
      { error: "This comment no longer exists." },
      { status: 404, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const isAdmin = profile.role === "admin";
  const ownsComment = comment.author_id === user.id;

  if (!isAdmin && !ownsComment) {
    return NextResponse.json(
      { error: "You can only delete your own comment." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { error: deleteError } = await serviceSupabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    console.error("Delete comment failed:", deleteError);
    return NextResponse.json(
      { error: deleteError.message || "Could not delete comment." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  await serviceSupabase.from("notifications").delete().eq("comment_id", commentId);

  return NextResponse.json(
    { ok: true, post_id: comment.post_id, comment_id: commentId },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
