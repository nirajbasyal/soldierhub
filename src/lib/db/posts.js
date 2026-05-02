"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Fetch posts with author info and counts (upvotes/comments/reports).
 * Reads from the `posts_with_meta` view defined in schema.sql.
 */
export async function listPosts({ limit = 50 } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("posts_with_meta")
    .select("*")
    .in("status", ["active", "reported"])
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

export async function listMyPosts(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  // Use my_posts_with_meta — the masked view (posts_with_meta) blanks
  // author_id for anonymous posts, which would hide the user's own posts
  // from their own profile page. RLS on the underlying posts table still
  // restricts what they can see.
  const { data, error } = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function listReportedPosts() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  // Admins need to see the real author of reported anonymous posts, so we use
  // my_posts_with_meta. RLS on `posts` already restricts this query to admins.
  const { data, error } = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .eq("status", "reported")
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function createPost({ author_id, category, title, body, anonymous }) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("posts")
    .insert([{ author_id, category, title, body, anonymous }])
    .select()
    .single();

  return { data, error };
}

export async function updateMyPost(postId, updates) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const allowed = {
    title: updates.title,
    body: updates.body,
    category: updates.category,
    edited: true,
  };
  Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k]);

  const { data, error } = await supabase
    .from("posts")
    .update(allowed)
    .eq("id", postId)
    .select()
    .single();

  return { data, error };
}

export async function deletePost(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase.from("posts").delete().eq("id", postId);
}

export async function restoreReportedPost(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  // Clear reports + flip status back to active
  await supabase.from("reports").delete().eq("post_id", postId);
  return supabase.from("posts").update({ status: "active" }).eq("id", postId);
}

// ─── Upvotes ─────────────────────────────────────────────────────────────
export async function listMyUpvotedPostIds(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("upvotes")
    .select("post_id")
    .eq("user_id", userId);

  return { data: (data || []).map((r) => r.post_id), error };
}

export async function addUpvote(postId, userId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase.from("upvotes").insert([{ post_id: postId, user_id: userId }]);
}

export async function removeUpvote(postId, userId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase
    .from("upvotes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
}

// ─── Reports ─────────────────────────────────────────────────────────────
export async function listMyReportedPostIds(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("reports")
    .select("post_id")
    .eq("user_id", userId);

  return { data: (data || []).map((r) => r.post_id), error };
}

export async function reportPost(postId, userId, reason = "") {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase
    .from("reports")
    .insert([{ post_id: postId, user_id: userId, reason }]);
}
