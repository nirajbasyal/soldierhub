"use client";

import { createClient } from "@/lib/supabase/client";

const NOTIFICATION_SELECT = "*";

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

function networkErrorResult(fallbackMessage) {
  return {
    data: null,
    error: {
      message: fallbackMessage,
      transient: true,
    },
  };
}

async function postJsonToApi(path, accessToken, payload, fallbackMessage) {
  let response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Notification API POST request failed:", error);
    return networkErrorResult(fallbackMessage);
  }

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
  let response;

  try {
    response = await fetch(path, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.warn("Notification API GET request failed:", error);
    return networkErrorResult(fallbackMessage);
  }

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

function getCachedUnreadCount(userId, { allowCache = true } = {}) {
  if (!allowCache || !userId) return null;
  if (unreadCountClientCache.userId !== userId) return null;
  if (Date.now() > unreadCountClientCache.expiresAt) return null;

  return unreadCountClientCache.count;
}

function setCachedUnreadCount(userId, count) {
  unreadCountClientCache = {
    userId,
    count: Math.max(0, Number(count) || 0),
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

function normalizeNotificationRow(row = {}) {
  const actorId =
    row.actor_user_id ||
    row.actor_id ||
    row.user_id ||
    row.profile_id ||
    row.created_by ||
    row.author_id ||
    null;

  const recipientId =
    row.recipient_user_id || row.recipient_id || row.owner_id || row.post_author_id || null;

  return {
    ...row,
    actor_user_id: actorId,
    actor_id: row.actor_id || actorId,
    recipient_user_id: recipientId,
    post_id: row.post_id || row.postId || row.post?.id || null,
    comment_id: row.comment_id || row.commentId || row.comment?.id || null,
    actor_name_cached:
      row.actor_name_cached || row.actor_name || row.author_name || row.profile_name || "Someone",
    actor_color_cached:
      row.actor_color_cached || row.actor_color || row.author_color || row.profile_color || "#314A66",
    actor_avatar_url: row.actor_avatar_url || row.actor_profile?.avatar_url || null,
    post_title_cached:
      row.post_title_cached || row.post_preview_cached || row.post_body_cached || "",
    post_preview_cached: row.post_preview_cached || row.post_title_cached || "",
    comment_body_cached: row.comment_body_cached || row.comment_body || "",
    type: row.type || row.notification_type || row.kind || "comment",
    read: Boolean(row.read),
    created_at: row.created_at || row.inserted_at || row.createdAt || new Date().toISOString(),
    post: row.post || null,
    comment: row.comment || null,
    actor_profile: row.actor_profile || null,
  };
}

async function loadPostsForNotifications(supabase, postIds = []) {
  const postById = new Map();
  const safePostIds = uniqueValues(postIds);
  if (!supabase || safePostIds.length === 0) return postById;

  const { data: tablePosts, error } = await supabase
    .from("posts")
    .select("id, body, category, anonymous, status, created_at")
    .in("id", safePostIds);

  if (!error) {
    (tablePosts || []).forEach((post) => {
      const normalized = normalizePostRow(post);
      if (normalized.id) postById.set(normalized.id, normalized);
    });
  }

  return postById;
}

async function loadCommentsForNotifications(supabase, commentIds = []) {
  const commentById = new Map();
  const safeCommentIds = uniqueValues(commentIds);
  if (!supabase || safeCommentIds.length === 0) return commentById;

  const { data: comments, error: commentError } = await supabase
    .from("comments")
    .select("id, post_id, body, author_id, created_at")
    .in("id", safeCommentIds);

  if (!commentError) {
    (comments || []).forEach((comment) => commentById.set(comment.id, comment));
  }

  return commentById;
}

async function loadProfilesForNotifications(supabase, actorIds = []) {
  const profileById = new Map();
  const safeActorIds = uniqueValues(actorIds);
  if (!supabase || safeActorIds.length === 0) return profileById;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_color")
    .in("id", safeActorIds);

  if (!error) {
    (data || []).forEach((profile) => profileById.set(profile.id, profile));
  }

  return profileById;
}

function normalizeHydratedRpcRows(rows = []) {
  return (rows || []).map((row) => {
    const normalized = normalizeNotificationRow(row);
    const post = row.post ? normalizePostRow(row.post) : null;
    const comment = row.comment || null;
    const actorProfile = row.actor_profile || null;

    return {
      ...normalized,
      post,
      comment,
      actor_profile: actorProfile,
      actor_user_id: normalized.actor_user_id || actorProfile?.id || null,
      actor_id: normalized.actor_id || normalized.actor_user_id || actorProfile?.id || null,
      actor_name_cached:
        normalized.actor_name_cached || actorProfile?.full_name || "Someone",
      actor_color_cached:
        normalized.actor_color_cached || actorProfile?.avatar_color || "#314A66",
      actor_avatar_url: normalized.actor_avatar_url || actorProfile?.avatar_url || null,
      post_id: normalized.post_id || post?.id || comment?.post_id || null,
      post_preview_cached:
        normalized.post_preview_cached || post?.body || normalized.post_title_cached || "",
      post_title_cached:
        normalized.post_title_cached || normalized.post_preview_cached || post?.body || "",
      comment_body_cached: normalized.comment_body_cached || comment?.body || "",
    };
  });
}

async function listHydratedNotificationsFromRpc(
  supabase,
  { limit = 30, cursorCreatedAt = null, cursorId = null, notificationIds = null } = {}
) {
  if (!supabase) return { data: [], error: null };

  const safeNotificationIds = Array.isArray(notificationIds)
    ? uniqueValues(notificationIds).slice(0, 50)
    : null;

  const { data, error } = await supabase.rpc("list_my_notifications_hydrated", {
    p_limit: Math.max(1, Math.min(limit, 50)),
    p_cursor_created_at: cursorCreatedAt || null,
    p_cursor_id: cursorId || null,
    p_notification_ids: safeNotificationIds,
  });

  if (error) return { data: [], error };

  return { data: normalizeHydratedRpcRows(data || []), error: null };
}

export async function hydrateNotificationRows(rows = []) {
  const supabase = createClient();

  if (!Array.isArray(rows) || rows.length === 0) return rows || [];

  try {
    const notificationIds = uniqueValues(rows.map((row) => row?.id));

    if (notificationIds.length > 0) {
      const { data, error } = await listHydratedNotificationsFromRpc(supabase, {
        limit: notificationIds.length,
        notificationIds,
      });

      if (!error && data?.length) {
        const hydratedById = new Map(data.map((row) => [row.id, row]));
        return rows.map((row) => hydratedById.get(row.id) || normalizeNotificationRow(row));
      }
    }

    return hydrateNotifications(supabase, rows);
  } catch (error) {
    console.error("Notification hydration failed:", error);
    return rows.map(normalizeNotificationRow);
  }
}

async function hydrateNotifications(supabase, rows = []) {
  if (!supabase || !Array.isArray(rows) || rows.length === 0) return rows || [];

  const normalizedRows = rows.map(normalizeNotificationRow);
  const commentById = await loadCommentsForNotifications(
    supabase,
    normalizedRows.map((row) => row.comment_id)
  );

  const resolvedPostIds = uniqueValues(
    normalizedRows.map((row) => row.post_id || commentById.get(row.comment_id)?.post_id)
  );
  const postById = await loadPostsForNotifications(supabase, resolvedPostIds);
  const resolvedActorIds = uniqueValues(
    normalizedRows.map((row) => {
      const comment = commentById.get(row.comment_id) || null;
      return comment?.author_id || row.actor_user_id || row.actor_id || null;
    })
  );
  const profileById = await loadProfilesForNotifications(supabase, resolvedActorIds);

  return normalizedRows.map((row) => {
    const comment = commentById.get(row.comment_id) || null;
    const resolvedPostId = row.post_id || comment?.post_id || null;
    const post = postById.get(resolvedPostId) || null;
    const postPreview = post?.body || row.post_title_cached || "";
    const isCommentNotification = row.type === "comment";
    const resolvedActorId = isCommentNotification
      ? comment?.author_id || row.actor_user_id || row.actor_id || null
      : row.actor_user_id || row.actor_id || null;
    const profile = profileById.get(resolvedActorId) || null;

    return {
      ...row,
      actor_user_id: resolvedActorId,
      actor_id: resolvedActorId,
      actor_name_cached: profile?.full_name || row.actor_name_cached || "Someone",
      actor_color_cached: profile?.avatar_color || row.actor_color_cached || "#314A66",
      post_id: resolvedPostId,
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

  const rpcResult = await listHydratedNotificationsFromRpc(supabase, {
    limit,
    cursorCreatedAt,
    cursorId,
  });

  if (!rpcResult.error) {
    return { data: rpcResult.data || [], error: null };
  }

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

export async function getUnreadCount(userId, { skipCache = false } = {}) {
  const cachedCount = getCachedUnreadCount(userId, { allowCache: !skipCache });
  if (cachedCount !== null) return { count: cachedCount, error: null, cached: true };

  const supabase = createClient();
  if (!supabase) return { count: 0, error: null, cached: false };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before loading notifications."
  );

  if (error || !accessToken) return { count: 0, error, cached: false };

  const cacheBuster = skipCache ? `?t=${Date.now()}` : "";
  const result = await getJsonFromApi(
    `/api/notifications/unread-count${cacheBuster}`,
    accessToken,
    "Could not load unread count."
  );

  if (result.error) return { count: 0, error: result.error, cached: false };

  const count = Math.max(0, Number(result.data?.count) || 0);
  setCachedUnreadCount(userId, count);

  return { count, error: null, cached: false };
}
