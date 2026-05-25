"use client";

import { createClient } from "@/lib/supabase/client";

export async function getPublicProfile(userId) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: null, error: null };

  const { data, error } = await supabase.rpc("get_public_profile", {
    p_user_id: userId,
  });

  return {
    data: data?.[0] || null,
    error,
  };
}

export async function listPublicPostsByAuthor(userId, { limit = 30 } = {}) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  const rpcResult = await supabase.rpc("list_public_posts_by_author", {
    p_profile_id: userId,
    p_limit: limit,
  });

  if (!rpcResult.error) {
    return { data: rpcResult.data || [], error: null };
  }

  const fallback = await supabase.rpc("get_public_posts", {
    limit_count: Math.max(limit, 50),
  });

  if (fallback.error) return { data: [], error: rpcResult.error || fallback.error };

  const posts = (fallback.data || []).filter(
    (post) => post.author_id === userId && post.anonymous !== true
  );

  return { data: posts, error: null };
}
