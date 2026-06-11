import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { checkContentSafety } from "@/lib/server/contentSafety";
import { CATEGORIES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POST_SELECT =
  "id, author_id, author_name_cached, author_color_cached, category, body, anonymous, status, edited, created_at, updated_at, moderation_status, moderation_reason, moderation_checked_at";

const MAX_BODY_LENGTH = 5000;
const VALID_POST_CATEGORIES = new Set(CATEGORIES.filter((category) => category.key !== "All").map((category) => category.key));

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

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getProfileStatus(profile) {
  return profile?.verification_status || "pending";
}

function normalizePostRow(row = {}) {
  return {
    ...row,
    id: row.id,
    post_id: row.id,
    author_name: row.author_name_cached || "Member",
    author_color: row.author_color_cached || "#314A66",
  };
}

function cleanPostCategory(value) {
  const category = cleanText(value);
  return VALID_POST_CATEGORIES.has(category) ? category : null;
}

function validateUpdateInput({ body, category }) {
  if (body !== undefined && !cleanText(body)) return "Post body is required.";
  if (body !== undefined && cleanText(body).length > MAX_BODY_LENGTH) {
    return `Post body must be ${MAX_BODY_LENGTH} characters or less.`;
  }
  if (category !== undefined && !cleanPostCategory(category)) {
    return "Please choose a valid post category.";
  }
  return null;
}

function getModerationFields(safety) {
  const checkedAt = new Date().toISOString();
  if (safety?.degraded) {
    return {
      moderation_status: "degraded",
      moderation_reason: safety.degradedReason || safety.blockedBy || "moderation_degraded",
      moderation_checked_at: checkedAt,
    };
  }

  return {
    moderation_status: "approved",
    moderation_reason: safety?.blockedBy || null,
    moderation_checked_at: checkedAt,
  };
}

async function verifyUserAndProfile({ supabase, accessToken }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { error: "Please log in again before managing this post." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      user,
      profile: null,
      response: NextResponse.json(
        { error: "Could not verify your profile. Please try again." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return {
      user,
      profile,
      response: NextResponse.json(
        { error: "Your profile must be verified before managing posts." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  return { user, profile, response: null };
}

async function getOwnedPost({ supabase, postId, userId }) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (error) return { data: null, error };

  if (!data || data.author_id !== userId) {
    return {
      data: null,
      error: { message: "You can only manage posts from your own account." },
      status: data ? 403 : 404,
    };
  }

  return { data, error: null, status: 200 };
}

async function updatePost({ supabase, postId, updates, moderationFields = {} }) {
  const allowed = {
    body: updates.body !== undefined ? cleanText(updates.body) : undefined,
    category: updates.category !== undefined ? cleanPostCategory(updates.category) : undefined,
    edited: true,
    ...moderationFields,
  };

  Object.keys(allowed).forEach((key) => {
    if (allowed[key] === undefined) delete allowed[key];
  });

  const { data, error } = await supabase
    .from("posts")
    .update(allowed)
    .eq("id", postId)
    .select(POST_SELECT)
    .maybeSingle();

  return { data, error };
}

async function deletePost({ supabase, postId }) {
  const rpcResult = await supabase.rpc("delete_own_post", { p_post_id: postId });

  if (!rpcResult.error && rpcResult.data === true) {
    return { data: { id: postId }, error: null, deleted: true };
  }

  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id");

  if (error) return { data: null, error, deleted: false };

  return { data, error: null, deleted: Array.isArray(data) && data.length > 0 };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "posts-manage-ip",
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before managing this post." },
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

  const { user, response: authResponse } = await verifyUserAndProfile({ supabase, accessToken });

  if (authResponse) {
    const body = await authResponse.json();
    return NextResponse.json(body, {
      status: authResponse.status,
      headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" },
    });
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `posts-manage-user-${user.id}`,
    limit: 35,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid post management request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const action = cleanText(requestBody?.action).toLowerCase();
  const postId = cleanText(requestBody?.post_id || requestBody?.postId);
  const updates = requestBody?.updates || {};

  if (action !== "update" && action !== "delete") {
    return NextResponse.json(
      { error: "Invalid post management action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!postId) {
    return NextResponse.json(
      { error: "Post was not identified. Please refresh and try again." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const ownedPost = await getOwnedPost({ supabase, postId, userId: user.id });

  if (ownedPost.error) {
    return NextResponse.json(
      { error: ownedPost.error.message || "Could not verify post ownership." },
      { status: ownedPost.status || 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (action === "update") {
    const validationError = validateUpdateInput(updates);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    let moderationFields = {};

    if (updates.body !== undefined) {
      const safety = await checkContentSafety(cleanText(updates.body));
      if (!safety.allowed) {
        return NextResponse.json(
          { error: safety.reason || "This post could not be updated." },
          {
            status: safety.temporaryFailure ? 503 : 400,
            headers: { ...userRateLimit.headers, "Cache-Control": "no-store" },
          }
        );
      }
      moderationFields = getModerationFields(safety);
    }

    const { data, error } = await updatePost({ supabase, postId, updates, moderationFields });

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Post was not updated." },
        { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { post: normalizePostRow(data) },
      { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data, error, deleted } = await deletePost({ supabase, postId });

  if (error || !deleted) {
    return NextResponse.json(
      { error: error?.message || "Post was not deleted." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { deleted: true, post: { id: postId }, data },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
