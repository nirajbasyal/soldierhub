"use client";

import { createClient } from "@/lib/supabase/client";

const NOTIFICATION_SELECT =
  "id, recipient_user_id, actor_user_id, actor_name_cached, type, post_id, post_title_cached, comment_id, read, created_at";

let unreadCountClientCache = {
  userId: null,
  count: 0,
  expiresAt: 0,
};

async function getAccessTokenForApi(supabase, fallbackMessage) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      accessToken: null,
      error: sessionError || { message: fallbackMessage },
    };
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
            ? "You are updating notifications too quickly. Please try again shortly."
            : fallbackMessage),
      },
    };
  }

  return { data: result || null, error: null };
}

async function getJsonFromApi(path, accessToken, fallbackMessage) {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
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
            ? "You are checking notifications too quickly. Please try again shortly."
            : fallbackMessage),
      },
    };
  }

  return { data: result || null, error: null };
}

function getCachedUnreadCount(userId) {
  if (!userId) return null;
  if (unreadCountClientCache.userId !== userId) return null;
  if (Date.now() > unreadCountClientCache.expiresAt) return null;

  return unreadCountClientCache.count;
}

function setCachedUnreadCount(userId, count) {
  unreadCountClientCache = {
    userId,
    count: count || 0,
    expiresAt: Date.now() + 20 * 1000,
  };
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizePostRow(row = {}) {
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;

  return {
    ...row,
    id: postId,
    post_id: postId,
    body: row.body || row.post_body || row.content || row.text || "",
    category: row.category || "general",
    anonymous: Boolean(row.anonymous),
    status: row.status || "active",
    created_at: row.created_at || null,
  };
}

async function loadPostsForNotifications(supabase, postIds = []) {
  const postById = new Map();
  if (!supabase || postIds.length === 0) return postById;

  const { data: viewPosts, error: viewError } = await supabase
    .from("posts_with_meta")
    .select("*")
    .in("id", postIds);

  if (!viewError) {
    (viewPosts || []).forEach((post) => {
      const normalized = normalizePostRow(post);
      if (normalized.id) postById.set(normalized.id, normalized);
    });
  }

  const missingPostIds = postIds.filter((postId) => !postById.has(postId));
  if (missingPostIds.length === 0) return postById;

  const { data: tablePosts, error: tableError } = await supabase
    .from("posts")
    .select("id, body, category, anonymous, status, created_at")
    .in("id", missingPostIds);

  if (!tableError) {
    (tablePosts || []).forEach((post) => {
      const normalized = normalizePostRow(post);
      if (normalized.id) postById.set(normalized.id, normalized);
    });
  }

  return postById;
}

async function hydrateNotifications(supabase, rows = []) {
  if (!supabase || !Array.isArray(rows) || rows.length === 0) return rows || [];

  const postIds = uniqueValues(rows.map((row) => row.post_id));
  const commentIds = uniqueValues(rows.map((row) => row.comment_id));
  const postById = await loadPostsForNotifications(supabase, postIds);
  const commentById = new Map();

  if (commentIds.length > 0) {
    const { data: comments, error: commentError } = await supabase
      .from("comments")
      .select("id, post_id, body, author_id, created_at")
      .in("id", commentIds);

    if (!commentError) {
      (comments || []).forEach((comment) => commentById.set(comment.id, comment));
    }
  }

  return rows.map((row) => {
    const post = postById.get(row.post_id) || null;
    const comment = commentById.get(row.comment_id) || null;
    const postPreview = post?.body || row.post_title_cached || "";

    return {
      ...row,
      post,
      comment,
      post_preview_cached: postPreview,
      post_title_cached: row.post_title_cached || postPreview,
      comment_body_cached: comment?.body || row.comment_body_cached || "",
    };
  });
}

export function clearUnreadCountCache() {
  unreadCountClientCache = {
    userId: null,
    count: 0,
    expiresAt: 0,
  };
}

export async function listMyNotifications(
  userId,
  { limit = 30, cursorCreatedAt = null, cursorId = null } = {}
) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;

  if (error) return { data: [], error };

  return { data: await hydrateNotifications(supabase, data || []), error: null };
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before updating notifications."
  );

  if (error || !accessToken) return { data: null, error };

  const result = await postJsonToApi(
    "/api/notifications/mark-read",
    accessToken,
    {},
    "Could not update notifications."
  );

  if (!result.error) clearUnreadCountCache();

  return result;
}

export async function getUnreadCount(userId) {
  const cachedCount = getCachedUnreadCount(userId);
  if (cachedCount !== null) return { count: cachedCount, error: null };

  const supabase = createClient();
  if (!supabase) return { count: 0, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before loading notifications."
  );

  if (error || !accessToken) return { count: 0, error };

  const result = await getJsonFromApi(
    "/api/notifications/unread-count",
    accessToken,
    "Could not load unread count."
  );

  if (result.error) return { count: 0, error: result.error };

  const count = result.data?.count || 0;
  setCachedUnreadCount(userId, count);

  return { count, error: null };
}
