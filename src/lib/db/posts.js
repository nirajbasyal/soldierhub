"use client";

import { createClient } from "@/lib/supabase/client";
import { normalizePostRow } from "@/lib/db/postNormalize";

export { normalizePostRow };

const POST_SELECT =
  "id, author_id, author_name_cached, author_color_cached, category, body, anonymous, status, edited, created_at, updated_at, image_url, image_key, image_width, image_height, image_size, image_thumbnail_url, image_thumbnail_key, image_thumbnail_width, image_thumbnail_height, image_thumbnail_size";

const RPC_MODE_FULL = "full";
const RPC_MODE_LIMIT = "limit";
const RPC_MODE_EMPTY = "empty";

let workingPublicPostsRpcMode = null;

function resolvePostId(input) {
  if (!input) return null;
  if (typeof input === "object") return input.id || input.post_id || input.postId || input.post?.id || null;
  return input;
}

function uniquePostIds(postIds = []) {
  return [...new Set((postIds || []).filter(Boolean))];
}

function hasFeedCursor(cursorCreatedAt, cursorId) {
  return Boolean(cursorCreatedAt || cursorId);
}

function cleanSearchLimit(limit, fallback = 20, max = 50) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function cleanSearchOffset(offset) {
  const parsed = Number(offset);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

async function fetchProfilesByIds(supabase, authorIds = []) {
  const safeIds = [...new Set((authorIds || []).filter(Boolean))].slice(0, 100);
  if (!supabase || safeIds.length === 0) return [];

  const rpcResult = await supabase.rpc("get_public_profiles_for_ids", {
    p_user_ids: safeIds,
  });

  if (!rpcResult.error) return rpcResult.data || [];

  const fullResult = await supabase
    .from("public_profiles")
    .select("id, full_name, avatar_color, avatar_url")
    .in("id", safeIds);

  if (!fullResult.error) return fullResult.data || [];

  return [];
}

async function attachProfilesToPosts(supabase, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const normalizedRows = rows.map(normalizePostRow);
  const profileRows = normalizedRows.filter((row) => {
    if (!row.author_id || row.anonymous) return false;
    return !row.author_name || row.author_name === "Member" || !row.author_color || !row.author_avatar_url;
  });

  if (profileRows.length === 0) return normalizedRows;

  const profiles = await fetchProfilesByIds(
    supabase,
    profileRows.map((row) => row.author_id)
  );
  if (!profiles.length) return normalizedRows;

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return normalizedRows.map((row) =>
    normalizePostRow({ ...row, profile: profileById.get(row.author_id) || null })
  );
}

async function hydrateTablePosts(supabase, rows = []) {
  return attachProfilesToPosts(supabase, rows || []);
}

async function callPublicPostsRpc(
  supabase,
  mode,
  { limit = 30, cursorCreatedAt = null, cursorId = null } = {}
) {
  if (mode === RPC_MODE_LIMIT) return supabase.rpc("get_public_posts", { limit_count: limit });
  if (mode === RPC_MODE_EMPTY) return supabase.rpc("get_public_posts");

  return supabase.rpc("get_public_posts", {
    limit_count: limit,
    cursor_created_at: cursorCreatedAt,
    cursor_id: cursorId,
  });
}

async function listPostsFromRpc(
  supabase,
  { limit = 30, cursorCreatedAt = null, cursorId = null } = {}
) {
  const usingCursor = hasFeedCursor(cursorCreatedAt, cursorId);
  const attempts = usingCursor
    ? [RPC_MODE_FULL]
    : workingPublicPostsRpcMode
      ? [workingPublicPostsRpcMode]
      : [RPC_MODE_FULL, RPC_MODE_LIMIT, RPC_MODE_EMPTY];
  let lastError = null;

  for (const mode of attempts) {
    const result = await callPublicPostsRpc(supabase, mode, {
      limit,
      cursorCreatedAt,
      cursorId,
    });

    if (!result.error && Array.isArray(result.data)) {
      if (!usingCursor) workingPublicPostsRpcMode = mode;
      const hydratedPosts = await attachProfilesToPosts(supabase, result.data || []);
      return { data: hydratedPosts, error: null };
    }

    lastError = result.error || lastError;
  }

  if (!usingCursor && workingPublicPostsRpcMode) workingPublicPostsRpcMode = null;
  return { data: [], error: lastError };
}

export async function listPosts({ limit = 30, cursorCreatedAt = null, cursorId = null } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  return listPostsFromRpc(supabase, { limit, cursorCreatedAt, cursorId });
}

export async function searchPostsForSearchPage(query, { limit = 20, offset = 0 } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: { message: "Supabase is not configured." } };

  const cleanQuery = typeof query === "string" ? query.trim() : "";
  if (cleanQuery.length < 2) return { data: [], error: null };

  const safeLimit = cleanSearchLimit(limit, 20, 50);
  const safeOffset = cleanSearchOffset(offset);

  const { data, error } = await supabase.rpc("search_public_posts", {
    p_query: cleanQuery,
    p_limit: safeLimit,
    p_offset: safeOffset,
  });

  if (error) return { data: [], error };
  return { data: await attachProfilesToPosts(supabase, data || []), error: null };
}

export async function getLatestPublicPostMarker() {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase.rpc("get_latest_public_post_marker");
  const row = Array.isArray(data) ? data[0] : data;

  if (error) console.error("Latest public post marker failed:", error);

  return { data: row || null, error };
}

async function listMyPostsFromView(supabase, userId, limit) {
  const result = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!result.error) {
    return { data: await attachProfilesToPosts(supabase, result.data || []), error: null };
  }

  console.error("List my posts from metadata view failed:", result.error);

  const fallback = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: await hydrateTablePosts(supabase, fallback.data || []), error: fallback.error };
}

async function listReportedPostsFromView(supabase) {
  const result = await supabase
    .from("posts_with_meta")
    .select("*")
    .eq("status", "reported")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!result.error) {
    return { data: await attachProfilesToPosts(supabase, result.data || []), error: null };
  }

  console.error("List reported posts from metadata view failed:", result.error);

  const fallback = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "reported")
    .order("created_at", { ascending: false })
    .limit(50);

  return { data: await hydrateTablePosts(supabase, fallback.data || []), error: fallback.error };
}

export async function listMyPosts(userId, { limit = 30 } = {}) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  return listMyPostsFromView(supabase, userId, limit);
}

export async function listReportedPosts() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  return listReportedPostsFromView(supabase);
}

async function getAccessTokenForApi(supabase, fallbackMessage) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return { accessToken: null, error: sessionError || { message: fallbackMessage } };
  }

  return { accessToken: session.access_token, error: null };
}

async function postJsonToApi(path, accessToken, payload, fallbackMessage) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          result?.error ||
          (response.status === 429
            ? "You are doing that too quickly. Please try again shortly."
            : fallbackMessage),
      },
    };
  }

  return { data: result, error: null };
}

export async function createPost({ category, body, anonymous, image = null }) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before posting."
  );
  if (error || !accessToken) return { data: null, error };

  const result = await postJsonToApi(
    "/api/posts/create",
    accessToken,
    { category, body, anonymous, image },
    "Could not create post."
  );
  if (result.error) return result;

  return { data: normalizePostRow(result.data?.post || {}), error: null };
}

export async function updateMyPost(postId, updates = {}) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const resolvedPostId = resolvePostId(postId);
  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before editing your post."
  );
  if (error || !accessToken) return { data: null, error };

  const result = await postJsonToApi(
    "/api/posts/manage",
    accessToken,
    { action: "update", post_id: resolvedPostId, updates },
    "Could not update post."
  );
  if (result.error) return result;

  return { data: normalizePostRow(result.data?.post || {}), error: null };
}

export async function deletePost(postId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null, deleted: false };

  const resolvedPostId = resolvePostId(postId);
  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before deleting your post."
  );
  if (error || !accessToken) return { data: null, error, deleted: false };

  const result = await postJsonToApi(
    "/api/posts/manage",
    accessToken,
    { action: "delete", post_id: resolvedPostId },
    "Could not delete post."
  );
  if (result.error) return { data: null, error: result.error, deleted: false };

  return {
    data: result.data?.data || result.data?.post || { id: resolvedPostId },
    error: null,
    deleted: result.data?.deleted === true,
  };
}

export async function deleteMyPost(postId) {
  return deletePost(postId);
}

export async function restoreReportedPost(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { data, error } = await supabase.rpc("restore_reported_post", {
    p_post_id: resolvePostId(postId),
  });

  if (error) console.error("Restore reported post failed:", error);

  return { data, error };
}

export async function listMyFeedViewerState(userId, postIds = []) {
  const supabase = createClient();
  const safePostIds = uniquePostIds(postIds);

  if (!supabase || !userId || safePostIds.length === 0) {
    return { data: { upvotedPostIds: [], reportedPostIds: [] }, error: null };
  }

  const rpcResult = await supabase.rpc("get_my_feed_viewer_state", {
    p_post_ids: safePostIds,
  });

  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return {
      data: {
        upvotedPostIds: row?.upvoted_post_ids || [],
        reportedPostIds: row?.reported_post_ids || [],
      },
      error: null,
    };
  }

  console.error("Feed viewer state RPC failed; using safe fallback:", rpcResult.error);

  const [{ data: upvotedPostIds, error: upvoteError }, { data: reportedPostIds, error: reportError }] =
    await Promise.all([
      listMyUpvotedPostIds(userId, safePostIds),
      listMyReportedPostIds(userId, safePostIds),
    ]);

  return {
    data: {
      upvotedPostIds: upvotedPostIds || [],
      reportedPostIds: reportedPostIds || [],
    },
    error: upvoteError || reportError || null,
  };
}

export async function listMyUpvotedPostIds(userId, postIds = []) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  const safePostIds = uniquePostIds(postIds);
  let query = supabase.from("upvotes").select("post_id").eq("user_id", userId);

  if (safePostIds.length > 0) query = query.in("post_id", safePostIds);
  else query = query.limit(250);

  const { data, error } = await query;

  if (error) console.error("List my upvotes failed:", error);

  return { data: uniquePostIds((data || []).map((row) => row.post_id)), error };
}

export async function addUpvote(postId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before voting."
  );
  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/posts/upvote",
    accessToken,
    { post_id: resolvePostId(postId), action: "add" },
    "Could not add vote."
  );
}

export async function removeUpvote(postId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before voting."
  );
  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/posts/upvote",
    accessToken,
    { post_id: resolvePostId(postId), action: "remove" },
    "Could not remove vote."
  );
}

export async function toggleUpvote(postId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before voting."
  );
  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/posts/upvote",
    accessToken,
    { post_id: resolvePostId(postId), action: "toggle" },
    "Could not update vote."
  );
}

export async function togglePostUpvote(postId) {
  return toggleUpvote(postId);
}

export async function listMyReportedPostIds(userId, postIds = []) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  const safePostIds = uniquePostIds(postIds);
  let query = supabase.from("reports").select("post_id").eq("user_id", userId);

  if (safePostIds.length > 0) query = query.in("post_id", safePostIds);
  else query = query.limit(250);

  const { data, error } = await query;

  if (error) console.error("List my reports failed:", error);

  return { data: uniquePostIds((data || []).map((row) => row.post_id)), error };
}

export async function reportPost(postId, userId, reason = "") {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const resolvedPostId = resolvePostId(postId);

  if (!userId) {
    return { data: null, error: { message: "Please log in before reporting a post." } };
  }

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before reporting a post."
  );
  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/posts/report",
    accessToken,
    { post_id: resolvedPostId, reason },
    "Could not report post."
  );
}

export async function togglePostReport(postId, reason = "") {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase.rpc("toggle_post_report", {
    p_post_id: resolvePostId(postId),
    p_reason: reason,
  });

  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error };
}
