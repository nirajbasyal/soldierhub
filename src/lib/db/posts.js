"use client";

import { createClient } from "@/lib/supabase/client";

const POST_SELECT =
  "id, author_id, author_name_cached, author_color_cached, category, body, anonymous, status, edited, created_at, updated_at";

const RPC_MODE_FULL = "full";
const RPC_MODE_LIMIT = "limit";
const RPC_MODE_EMPTY = "empty";

let workingPublicPostsRpcMode = null;

export function normalizePostRow(row = {}) {
  const profile = row.profile || row.profiles || row.author || null;
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;
  const commentCount = row.comment_count ?? row.comments_count ?? row.reply_count ?? 0;

  return {
    ...row,
    id: postId,
    post_id: postId,
    author_id:
      row.author_id ||
      row.user_id ||
      row.profile_id ||
      row.created_by ||
      row.author_user_id ||
      profile?.id ||
      null,
    author_name:
      row.author_name ||
      row.author_name_cached ||
      row.full_name ||
      row.profile_full_name ||
      profile?.full_name ||
      "Member",
    author_color:
      row.author_color ||
      row.author_color_cached ||
      row.avatar_color ||
      row.profile_avatar_color ||
      profile?.avatar_color ||
      "#314A66",
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: commentCount,
    reply_count: commentCount,
    report_count: row.report_count ?? row.reports_count ?? 0,
  };
}

function resolvePostId(input) {
  if (!input) return null;
  if (typeof input === "object") return input.id || input.post_id || input.postId || input.post?.id || null;
  return input;
}

function hasFeedCursor(cursorCreatedAt, cursorId) {
  return Boolean(cursorCreatedAt || cursorId);
}

async function attachProfilesToPosts(supabase, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const normalizedRows = rows.map(normalizePostRow);
  const missingProfileRows = normalizedRows.filter(
    (row) => row.author_id && (!row.author_name || row.author_name === "Member")
  );

  if (missingProfileRows.length === 0) return normalizedRows;

  const authorIds = [...new Set(missingProfileRows.map((row) => row.author_id))];
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_color")
    .in("id", authorIds);

  if (error) return normalizedRows;

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
      return { data: result.data.map(normalizePostRow), error: null };
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

async function listMyPostsFromView(supabase, userId, limit) {
  const result = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!result.error) {
    return { data: (result.data || []).map(normalizePostRow), error: null };
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
    return { data: (result.data || []).map(normalizePostRow), error: null };
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

export async function createPost({ category, body, anonymous }) {
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
    { category, body, anonymous },
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

export async function restoreReportedPost(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const resolvedPostId = resolvePostId(postId);
  const { data, error } = await supabase.rpc("restore_reported_post", {
    p_post_id: resolvedPostId,
  });

  if (error) console.error("Restore reported post failed:", error);

  return { data, error };
}

export async function listMyUpvotedPostIds(userId, postIds = []) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  const safePostIds = Array.isArray(postIds) ? postIds.filter(Boolean) : [];
  let query = supabase.from("upvotes").select("post_id").eq("user_id", userId);

  if (safePostIds.length > 0) {
    query = query.in("post_id", safePostIds);
  }

  const { data, error } = await query;

  if (error) console.error("List my upvotes failed:", error);

  return { data: (data || []).map((r) => r.post_id), error };
}

export async function addUpvote(postId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const resolvedPostId = resolvePostId(postId);
  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before voting."
  );
  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/posts/upvote",
    accessToken,
    { post_id: resolvedPostId, action: "add" },
    "Could not add vote."
  );
}

export async function removeUpvote(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const resolvedPostId = resolvePostId(postId);
  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before voting."
  );
  if (error || !accessToken) return { error };

  const result = await postJsonToApi(
    "/api/posts/upvote",
    accessToken,
    { post_id: resolvedPostId, action: "remove" },
    "Could not remove vote."
  );

  return { error: result.error };
}

export async function listMyReportedPostIds(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("reports")
    .select("post_id")
    .eq("user_id", userId);

  if (error) console.error("List my reports failed:", error);

  return { data: (data || []).map((r) => r.post_id), error };
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
