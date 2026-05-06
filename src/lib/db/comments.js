"use client";

import { createClient } from "@/lib/supabase/client";

// Comments are read through safe RPC functions.
// This prevents anonymous post authors from leaking their real name
// when commenting under their own anonymous post.

export async function listCommentsForPost(postId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  // The updated Supabase function uses `target_post_id`.
  // Keep a fallback to the older `p_post_id` name so local/staging DBs do not break.
  let result = await supabase.rpc("get_public_comments_for_post", {
    target_post_id: postId,
  });

  if (result.error) {
    const fallback = await supabase.rpc("get_public_comments_for_post", {
      p_post_id: postId,
    });

    if (!fallback.error) {
      result = fallback;
    }
  }

  return { data: result.data || [], error: result.error };
}

export async function listCommentsForPosts(postIds) {
  const supabase = createClient();
  if (!supabase || postIds.length === 0) return { data: [], error: null };

  const results = await Promise.all(
    postIds.map((postId) => listCommentsForPost(postId))
  );

  const data = results.flatMap((result) => result.data || []);
  const error = results.find((result) => result.error)?.error || null;

  return { data, error };
}

export async function createComment({ post_id, body }) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase.rpc("create_comment_safe", {
    p_post_id: post_id,
    p_body: body,
  });

  return {
    data: data?.[0] || null,
    error,
  };
}

export async function deleteComment(commentId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  return supabase.from("comments").delete().eq("id", commentId);
}
