"use client";

import { createClient } from "@/lib/supabase/client";

function normalizePostRow(row = {}) {
  // IMPORTANT: `id` must be the real public.posts.id.
  // Upvotes, reports, comments, edit, and delete all target public.posts.id.
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;
  const profile = row.profile || row.profiles || row.author || null;

  return {
    ...row,
    id: postId,
    post_id: postId,
    author_id:
      row.author_id ||
      row.user_id ||
      row.profile_id ||
      row.created_by ||
      row.author_user_id ||
      profile?.id ||
      null,
    author_name:
      row.author_name ||
      row.author_name_cached ||
      row.full_name ||
      row.profile_full_name ||
      profile?.full_name ||
      "Member",
    author_color:
      row.author_color ||
      row.author_color_cached ||
      row.avatar_color ||
      row.profile_avatar_color ||
      profile?.avatar_color ||
      "#314A66",
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: row.comment_count ?? row.comments_count ?? row.reply_count ?? 0,
  };
}

function resolvePostId(input) {
  if (!input) return null;

  if (typeof input === "object") {
    return input.id || input.post_id || input.postId || input.post?.id || null;
  }

  return input;
}

async function attachProfilesToPosts(supabase, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))];

  if (authorIds.length === 0) return rows.map(normalizePostRow);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_color")
    .in("id", authorIds);

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return rows.map((row) =>
    normalizePostRow({
      ...row,
      profile: profileById.get(row.author_id) || null,
    })
  );
}

async function listPostsFromView(supabase, limit) {
  const result = await supabase
    .from("posts_with_meta")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: (result.data || []).map(normalizePostRow),
    error: result.error,
  };
}

async function listPostsFromTable(supabase, limit) {
  const result = await supabase
    .from("posts")
    .select(
      "id, author_id, category, title, body, anonymous, status, edited, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: await attachProfilesToPosts(supabase, result.data || []),
    error: result.error,
  };
}

async function listPostsFromRpc(supabase, limit) {
  const attempts = [
    () => supabase.rpc("get_public_posts", { limit_count: limit }),
    () => supabase.rpc("get_public_posts", { p_limit: limit }),
    () => supabase.rpc("get_public_posts"),
  ];

  let lastError = null;

  for (const attempt of attempts) {
    const result = await attempt();

    if (!result.error && Array.isArray(result.data)) {
      return {
        data: result.data.map(normalizePostRow),
        error: null,
      };
    }

    lastError = result.error || lastError;
  }

  return { data: [], error: lastError };
}

export async function listPosts({ limit = 30 } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const viewResult = await listPostsFromView(supabase, limit);
  if (!viewResult.error && viewResult.data.length > 0) return viewResult;

  const tableResult = await listPostsFromTable(supabase, limit);
  if (!tableResult.error && tableResult.data.length > 0) return tableResult;

  const rpcResult = await listPostsFromRpc(supabase, limit);
  if (!rpcResult.error && rpcResult.data.length > 0) return rpcResult;

  if (!viewResult.error && !tableResult.error && !rpcResult.error) {
    return { data: [], error: null };
  }

  return {
    data: viewResult.data.length
      ? viewResult.data
      : tableResult.data.length
        ? tableResult.data
        : rpcResult.data,
    error: viewResult.error || tableResult.error || rpcResult.error,
  };
}

async function listMyPostsFromTable(supabase, userId, limit) {
  const result = await supabase
    .from("posts")
    .select(
      "id, author_id, category, title, body, anonymous, status, edited, created_at, updated_at"
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: await attachProfilesToPosts(supabase, result.data || []),
    error: result.error,
  };
}

async function listMyPostsFromView(supabase, userId, limit) {
  const result = await supabase
    .from("my_posts_with_meta")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  const normalized = (result.data || []).map(normalizePostRow);

  return {
    data: normalized.filter((post) => !post.author_id || post.author_id === userId),
    error: result.error,
  };
}

export async function listMyPosts(userId, { limit = 30 } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  if (!userId) return { data: [], error: null };

  const tableResult = await listMyPostsFromTable(supabase, userId, limit);
  if (!tableResult.error) return tableResult;

  return listMyPostsFromView(supabase, userId, limit);
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

  const payload = { author_id, category, title, body, anonymous };
  if (id) payload.id = id;

  const { data, error } = await supabase
    .from("posts")
    .insert([payload])
    .select(
      "id, author_id, category, title, body, anonymous, status, edited, created_at, updated_at"
    )
    .maybeSingle();

  if (error) return { data: null, error };

  const normalized = await attachProfilesToPosts(supabase, [
    data || {
      ...payload,
      created_at: new Date().toISOString(),
      status: "active",
      upvote_count: 0,
      comment_count: 0,
    },
  ]);

  return {
    data: normalized[0] || null,
    error: null,
  };
}

export async function updateMyPost(postId, updates = {}) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const resolvedPostId = resolvePostId(postId);

  if (!resolvedPostId) {
    return {
      data: null,
      error: { message: "Post was not identified. Please refresh and try again." },
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: { message: "Please log in again before editing your post." },
    };
  }

  const allowed = {
    title: updates.title,
    body: updates.body,
    category: updates.category,
    edited: true,
  };

  Object.keys(allowed).forEach((key) => {
    if (allowed[key] === undefined) delete allowed[key];
  });

  const { error, count } = await supabase
    .from("posts")
    .update(allowed, { count: "exact" })
    .eq("id", resolvedPostId)
    .eq("author_id", user.id);

  if (error) {
    return { data: null, error };
  }

  if (count === 0) {
    return {
      data: null,
      error: {
        message:
          "Post was not updated. This post may not belong to your account, or the post id coming from the UI does not match posts.id.",
      },
    };
  }

  return {
    data: {
      id: resolvedPostId,
      post_id: resolvedPostId,
      author_id: user.id,
      ...allowed,
    },
    error: null,
  };
}

export async function deletePost(postId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null, deleted: false };

  const resolvedPostId = resolvePostId(postId);

  if (!resolvedPostId) {
    return {
      data: null,
      error: { message: "Post was not identified. Please refresh and try again." },
      deleted: false,
    };
  }

  const rpcResult = await supabase.rpc("delete_own_post", {
    p_post_id: resolvedPostId,
  });

  if (!rpcResult.error && rpcResult.data === true) {
    return { data: { id: resolvedPostId }, error: null, deleted: true };
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", resolvedPostId)
    .select("id");

  if (error) return { data: null, error, deleted: false };

  if (!Array.isArray(data) || data.length === 0) {
    return {
      data: null,
      error: {
        message:
          "Post was not deleted. This account is not matching the original post owner, or the delete policy is missing in Supabase.",
      },
      deleted: false,
    };
  }

  return { data, error: null, deleted: true };
}

export async function restoreReportedPost(postId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const resolvedPostId = resolvePostId(postId);

  const { data, error } = await supabase.rpc("restore_reported_post", {
    p_post_id: resolvedPostId,
  });

  return { data, error };
}

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

  const resolvedPostId = resolvePostId(postId);

  return supabase
    .from("upvotes")
    .insert([{ post_id: resolvedPostId, user_id: userId }]);
}

export async function removeUpvote(postId, userId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const resolvedPostId = resolvePostId(postId);

  return supabase
    .from("upvotes")
    .delete()
    .eq("post_id", resolvedPostId)
    .eq("user_id", userId);
}

export async function listMyReportedPostIds(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("reports")
    .select("post_id")
    .eq("user_id", userId);

  return { data: (data || []).map((r) => r.post_id), error };
}

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

export async function reportPost(postId, userId, reason = "") {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const resolvedPostId = resolvePostId(postId);

  if (userId) {
    const { data, error } = await supabase
      .from("reports")
      .insert([{ post_id: resolvedPostId, user_id: userId, reason }])
      .select()
      .maybeSingle();

    return { data, error };
  }

  const visitorKey = getVisitorKey();

  const { data, error } = await supabase.rpc("create_visitor_report", {
    p_post_id: resolvedPostId,
    p_visitor_key: visitorKey,
    p_reason: reason,
  });

  return { data, error };
}
