"use client";

import { createClient } from "@/lib/supabase/client";

// Comments use cached author display fields — no join to `profiles` needed.
// This keeps emails out of the API response entirely.

export async function listCommentsForPost(postId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at, author_name_cached, author_color_cached")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return { data: data || [], error };
}

export async function listCommentsForPosts(postIds) {
  const supabase = createClient();
  if (!supabase || postIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at, author_name_cached, author_color_cached")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  return { data: data || [], error };
}

export async function createComment({ post_id, author_id, body }) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("comments")
    .insert([{ post_id, author_id, body }])
    .select("id, post_id, author_id, body, created_at, author_name_cached, author_color_cached")
    .single();

  return { data, error };
}

export async function deleteComment(commentId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase.from("comments").delete().eq("id", commentId);
}
