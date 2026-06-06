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
  return profile?.verification_status || "pending";
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCount(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, next) : Math.max(0, Number(fallback) || 0);
}

async function getAuthoritativeUpvoteState({ supabase, postId, userId, fallbackUserUpvoted = false }) {
  const [postMetaResult, ownVoteResult] = await Promise.all([
    supabase
      .from("posts_with_meta")
      .select("id, upvote_count")
      .eq("id", postId)
      .maybeSingle(),
    supabase
      .from("upvotes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (postMetaResult.error) {
    console.error("Read upvote count after toggle failed:", postMetaResult.error);
  }

  if (ownVoteResult.error) {
    console.error("Read own upvote state after toggle failed:", ownVoteResult.error);
  }

  return {
    upvote_count: normalizeCount(postMetaResult.data?.upvote_count, 0),
    user_upvoted: ownVoteResult.error ? Boolean(fallbackUserUpvoted) : Boolean(ownVoteResult.data?.post_id),
  };
}

function jsonWithRateLimit(body, status, headers) {
  return NextResponse.json(body, {
    status,
    headers: { ...headers, "Cache-Control": "no-store" },
  });
}

async function createUpvoteNotification({ supabase, postId, actorUserId, actorName }) {
  if (!postId || !actorUserId) return;

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, body")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post?.author_id || post.author_id === actorUserId) return;

  const { data: existingNotification } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_user_id", post.author_id)
    .eq("actor_user_id", actorUserId)
    .eq("post_id", postId)
    .eq("type", "upvote")
    .maybeSingle();

  if (existingNotification?.id) return;

  const { error } = await supabase.from("notifications").insert([
    {
      recipient_user_id: post.author_id,
      actor_user_id: actorUserId,
      actor_name_cached: actorName || "Someone",
      type: "upvote",
      post_id: postId,
      post_title_cached: post.body || "your post",
      read: false,
    },
  ]);

  if (error) {
    console.error("Create upvote notification failed:", error);
  }
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "posts-upvote-ip",
    limit: 90,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonWithRateLimit(
      { error: "Please log in again before voting." },
      401,
      ipRateLimit.headers
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);

  if (!supabase) {
    return jsonWithRateLimit(
      { error: "Supabase is not configured." },
      503,
      ipRateLimit.headers
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonWithRateLimit(
      { error: "Please log in again before voting." },
      401,
      ipRateLimit.headers
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `posts-upvote-user-${user.id}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return jsonWithRateLimit({ error: "Invalid vote request." }, 400, userRateLimit.headers);
  }

  const postId = cleanText(requestBody?.post_id || requestBody?.postId);
  const action = cleanText(requestBody?.action).toLowerCase();

  if (!postId) {
    return jsonWithRateLimit(
      { error: "Post was not identified. Please refresh and try again." },
      400,
      userRateLimit.headers
    );
  }

  if (action !== "add" && action !== "remove") {
    return jsonWithRateLimit({ error: "Invalid vote action." }, 400, userRateLimit.headers);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return jsonWithRateLimit(
      { error: "Could not verify your profile. Please try again." },
      500,
      userRateLimit.headers
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return jsonWithRateLimit(
      { error: "Your profile must be verified before voting." },
      403,
      userRateLimit.headers
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
      return jsonWithRateLimit(
        { error: error.message || "Could not remove vote." },
        500,
        userRateLimit.headers
      );
    }

    const state = await getAuthoritativeUpvoteState({
      supabase,
      postId,
      userId: user.id,
      fallbackUserUpvoted: false,
    });

    return jsonWithRateLimit(
      {
        action: "remove",
        removed: Array.isArray(data) ? data.length > 0 : false,
        ...state,
      },
      200,
      userRateLimit.headers
    );
  }

  const { data: existingVote } = await supabase
    .from("upvotes")
    .select("post_id, user_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVote) {
    const state = await getAuthoritativeUpvoteState({
      supabase,
      postId,
      userId: user.id,
      fallbackUserUpvoted: true,
    });

    return jsonWithRateLimit(
      { action: "add", upvote: existingVote, already_upvoted: true, ...state },
      200,
      userRateLimit.headers
    );
  }

  const { data, error } = await supabase
    .from("upvotes")
    .insert([{ post_id: postId, user_id: user.id }])
    .select("post_id, user_id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const state = await getAuthoritativeUpvoteState({
        supabase,
        postId,
        userId: user.id,
        fallbackUserUpvoted: true,
      });

      return jsonWithRateLimit(
        { action: "add", upvote: null, already_upvoted: true, ...state },
        200,
        userRateLimit.headers
      );
    }

    return jsonWithRateLimit(
      { error: error.message || "Could not add vote." },
      500,
      userRateLimit.headers
    );
  }

  await createUpvoteNotification({
    supabase,
    postId,
    actorUserId: user.id,
    actorName: profile.full_name || user.email || "Someone",
  });

  const state = await getAuthoritativeUpvoteState({
    supabase,
    postId,
    userId: user.id,
    fallbackUserUpvoted: true,
  });

  return jsonWithRateLimit(
    { action: "add", upvote: data, already_upvoted: false, ...state },
    201,
    userRateLimit.headers
  );
}
