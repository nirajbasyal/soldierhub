"use client";

import { createClient } from "@/lib/supabase/client";

const PUBLIC_PROFILE_FIELDS =
  "id, full_name, bio, avatar_color, avatar_url, role, status, verification_status, base, created_at";

export async function getPublicProfile(userId) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: null, error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_FIELDS)
    .eq("id", userId)
    .eq("status", "verified")
    .maybeSingle();

  return { data, error };
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
