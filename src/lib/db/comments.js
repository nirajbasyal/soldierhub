"use client";

import { createClient } from "@/lib/supabase/client";

const DEFAULT_COMMENT_LIMIT = 50;

// Comments are read through safe RPC functions.
// This prevents anonymous post authors from leaking their real name
// when commenting under their own anonymous post.

export async function listCommentsForPost(postId, { limit = DEFAULT_COMMENT_LIMIT } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  // The updated Supabase function uses `target_post_id` and `limit_count`.
  // Keep fallbacks so local/staging DBs do not break if they lag behind production.
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

  return { data: result.data || [], error: result.error };
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
      Authorization: `Bearer ${session.access_token}`,
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
    data: result?.comment || null,
    error: null,
  };
}

export async function deleteComment(commentId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  return supabase.from("comments").delete().eq("id", commentId);
}
