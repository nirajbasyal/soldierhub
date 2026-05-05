"use client";

import { createClient } from "@/lib/supabase/client";

// Comments are read through safe RPC functions.
// This prevents anonymous post authors from leaking their real name
// when commenting under their own anonymous post.

export async function listCommentsForPost(postId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase.rpc("get_public_comments_for_post", {
    p_post_id: postId,
  });

  return { data: data || [], error };
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