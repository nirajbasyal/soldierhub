"use client";

import { createClient } from "@/lib/supabase/client";

function normalizePostRow(row = {}) {
  return {
    ...row,
    author_name:
      row.author_name ||
      row.author_name_cached ||
      row.full_name ||
      row.profile_full_name ||
      "Member",
    author_color:
      row.author_color ||
      row.author_color_cached ||
      row.avatar_color ||
      row.profile_avatar_color ||
      "#314A66",
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: row.comment_count ?? row.comments_count ?? row.reply_count ?? 0,
  };
}

/**
 * Fetch public feed posts.
 * Primary path: safe RPC `get_public_posts`.
 * Fallback path: safe view `posts_with_meta`.
 * This prevents the feed from going empty if an RPC parameter/return shape changes.
 */
export async function listPosts({ limit = 30 } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const rpcResult = await supabase.rpc("get_public_posts", {
    limit_count: limit,
  });

  if (!rpcResult.error && Array.isArray(rpcResult.data)) {
    return {
      data: rpcResult.data.map(normalizePostRow),
      error: null,
    };
  }

  console.warn("get_public_posts failed. Falling back to posts_with_meta.", rpcResult.error);

  const fallbackResult = await supabase
    .from("posts_with_meta")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: (fallbackResult.data || []).map(normalizePostRow),
    error: fallbackResult.error || rpcResult.error,
  };
}

export async function listMyPosts(userId, { limit = 30 } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: (data || []).map(normalizePostRow), error };
}

export async function listReportedPosts() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .eq("status", "reported")
    .order("created_at", { ascending: false })
    .limit(50);

  return { data: (data || []).map(normalizePostRow), error };
}

export async function createPost({
  id,
  author_id,
  category,
  title,
  body,
  anonymous,
}) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const payload = {
    author_id,
    category,
    title,
    body,
    anonymous,
  };

  // This lets the composer create the post ID before publishing.
  // That keeps AnonymousXXXX the same while typing and after publishing.
  if (id) {
    payload.id = id;
  }

  const { error } = await supabase.from("posts").insert([payload]);

  if (error) return { data: null, error };

  // Avoid an extra round trip from `.select().single()`.
  // AppContext already performs optimistic UI and realtime/server refresh.
  return {
    data: normalizePostRow({
      ...payload,
      created_at: new Date().toISOString(),
      status: "active",
      upvote_count: 0,
      comment_count: 0,
    }),
    error: null,
  };
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

  Object.keys(allowed).forEach((k) => {
    if (allowed[k] === undefined) delete allowed[k];
  });

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

/**
 * Admin restore.
 * Uses RPC so both signed-in reports and visitor reports are cleared.
 */
export async function restoreReportedPost(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { data, error } = await supabase.rpc("restore_reported_post", {
    p_post_id: postId,
  });

  return { data, error };
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

/**
 * Creates/stores one stable visitor key in browser localStorage.
 * Supabase stores only the hash of this value through the RPC function.
 */
function getVisitorKey() {
  if (typeof window === "undefined") return null;

  const storageKey = "soldierhub_visitor_key";
  let visitorKey = window.localStorage.getItem(storageKey);

  if (!visitorKey) {
    visitorKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    window.localStorage.setItem(storageKey, visitorKey);
  }

  return visitorKey;
}

/**
 * Report post.
 * - Signed-in verified users report through `reports`.
 * - Logged-out visitors report through `create_visitor_report` RPC.
 */
export async function reportPost(postId, userId, reason = "") {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  if (userId) {
    const { data, error } = await supabase
      .from("reports")
      .insert([{ post_id: postId, user_id: userId, reason }])
      .select()
      .maybeSingle();

    return { data, error };
  }

  const visitorKey = getVisitorKey();

  const { data, error } = await supabase.rpc("create_visitor_report", {
    p_post_id: postId,
    p_visitor_key: visitorKey,
    p_reason: reason,
  });

  return { data, error };
}
