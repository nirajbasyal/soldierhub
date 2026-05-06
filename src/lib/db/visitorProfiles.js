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

export async function listPublicPostsByAuthor(userId, { limit = 100 } = {}) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  const { data, error } = await supabase.rpc("get_public_posts", {
    limit_count: limit,
  });

  if (error) return { data: [], error };

  const posts = (data || []).filter(
    (post) => post.author_id === userId && post.anonymous !== true
  );

  return { data: posts, error: null };
}
