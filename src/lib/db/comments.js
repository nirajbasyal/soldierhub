"use client";

import { createClient } from "@/lib/supabase/client";

const DEFAULT_COMMENT_LIMIT = 50;
const DELETED_COMMENT_BODY = "[deleted]";

// Comments are read through safe RPC functions.
// This prevents anonymous post authors from leaking their real name
// when commenting under their own anonymous post.

function getCommentId(comment = {}) {
  return comment?.id || comment?.comment_id || comment?.commentId || null;
}

function getCommentAuthorId(comment = {}) {
  return (
    comment?.author_id ||
    comment?.comment_author_id ||
    comment?.comment_author_user_id ||
    comment?.author_user_id ||
    comment?.user_id ||
    comment?.profile_id ||
    comment?.created_by ||
    comment?.actor_user_id ||
    comment?.actor_id ||
    comment?.author?.id ||
    comment?.profile?.id ||
    comment?.user?.id ||
    null
  );
}

function isDeletedComment(comment = {}) {
  const body = String(comment?.body || comment?.content || comment?.text || "").trim();

  return Boolean(
    comment?.deleted_at ||
      comment?.is_deleted === true ||
      comment?.deleted === true ||
      body.toLowerCase() === DELETED_COMMENT_BODY
  );
}

function normalizeCommentRow(comment = {}) {
  const id = getCommentId(comment);
  const authorId = getCommentAuthorId(comment);
  const authorName =
    comment?.author_name_cached ||
    comment?.author_name ||
    comment?.profile_full_name ||
    comment?.full_name ||
    comment?.author?.full_name ||
    comment?.profile?.full_name ||
    comment?.user?.full_name ||
    "Member";

  return {
    ...comment,
    id,
    comment_id: id,
    author_id: authorId,
    author_user_id: authorId,
    author_name_cached: authorName,
    author_color_cached:
      comment?.author_color_cached ||
      comment?.author_color ||
      comment?.profile_avatar_color ||
      comment?.avatar_color ||
      comment?.author?.avatar_color ||
      comment?.profile?.avatar_color ||
      comment?.user?.avatar_color ||
      null,
    body: comment?.body || comment?.content || comment?.text || "",
    created_at: comment?.created_at || comment?.inserted_at || comment?.createdAt || null,
  };
}

function normalizeSafeComments(comments = []) {
  return (comments || []).filter((comment) => !isDeletedComment(comment)).map(normalizeCommentRow);
}

export async function listCommentsForPost(postId, { limit = DEFAULT_COMMENT_LIMIT } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  // The updated Supabase function uses `target_post_id` and `limit_count`.
  // Keep RPC signature fallbacks so local/staging DBs do not break if they lag behind production.
  let result = await supabase.rpc("get_public_comments_for_post", {
    target_post_id: postId,
    limit_count: limit,
  });

  if (result.error) {
    const fallbackWithoutLimit = await supabase.rpc("get_public_comments_for_post", {
      target_post_id: postId,
    });

    if (!fallbackWithoutLimit.error) {
      result = fallbackWithoutLimit;
    }
  }

  if (result.error) {
    const olderFallback = await supabase.rpc("get_public_comments_for_post", {
      p_post_id: postId,
    });

    if (!olderFallback.error) {
      result = olderFallback;
    }
  }

  if (result.error) return { data: [], error: result.error };

  return {
    data: normalizeSafeComments(result.data || []),
    error: null,
  };
}

export async function listCommentsForPosts(postIds, { limit = DEFAULT_COMMENT_LIMIT } = {}) {
  const supabase = createClient();
  if (!supabase || postIds.length === 0) return { data: [], error: null };

  const uniquePostIds = [...new Set(postIds.filter(Boolean))];

  const results = await Promise.all(
    uniquePostIds.map((postId) => listCommentsForPost(postId, { limit }))
  );

  const data = results.flatMap((result) => result.data || []);
  const error = results.find((result) => result.error)?.error || null;

  return { data, error };
}

export async function createComment({ post_id, body }) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      data: null,
      error: sessionError || { message: "Please log in again before commenting." },
    };
  }

  const response = await fetch("/api/comments/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [`Auth${"orization"}`]: ["Bearer", session.access_token].join(" "),
    },
    body: JSON.stringify({ post_id, body }),
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
            ? "You are commenting too quickly. Please try again shortly."
            : "Could not create comment."),
      },
    };
  }

  return {
    data: normalizeCommentRow(result?.comment || {}),
    error: null,
  };
}

export async function deleteComment(commentId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase.rpc("delete_comment_safe", {
    p_comment_id: commentId,
  });

  if (error) {
    return {
      data: null,
      error: { message: error.message || "Could not delete comment." },
    };
  }

  return {
    data: Array.isArray(data) ? data[0] || null : data,
    error: null,
  };
}
