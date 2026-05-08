"use client";

import { createClient } from "@/lib/supabase/client";

const POST_SELECT =
  "id, author_id, author_name_cached, author_color_cached, category, title, body, anonymous, status, edited, created_at, updated_at";

function normalizePostRow(row = {}) {
  // IMPORTANT: id and post_id must both point to the real public.posts.id.
  // Upvotes, reports, comments, edit, and delete all target public.posts.id.
  const profile = row.profile || row.profiles || row.author || null;
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;

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

function getProfileStatus(profile) {
  return profile?.status || profile?.verification_status || "pending";
}

async function getAuthUserAndProfile(supabase) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      error: userError || { message: "Please log in again." },
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_color, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { user, profile: null, error: profileError };
  }

  return { user, profile, error: null };
}

async function attachProfilesToPosts(supabase, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const normalizedRows = rows.map(normalizePostRow);
  const missingProfileRows = normalizedRows.filter(
    (row) => row.author_id && (!row.author_name || row.author_name === "Member")
  );

  if (missingProfileRows.length === 0) return normalizedRows;

  const authorIds = [...new Set(missingProfileRows.map((row) => row.author_id))];

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_color")
    .in("id", authorIds);

  if (error) {
    console.error("Could not attach post profiles:", error);
    return normalizedRows;
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return normalizedRows.map((row) =>
    normalizePostRow({
      ...row,
      profile: profileById.get(row.author_id) || null,
    })
  );
}

async function attachCountsToPosts(supabase, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const postIds = [...new Set(rows.map((row) => row.id).filter(Boolean))];
  if (postIds.length === 0) return rows;

  const [{ data: upvotes, error: upvoteError }, { data: comments, error: commentError }] =
    await Promise.all([
      supabase.from("upvotes").select("post_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
    ]);

  if (upvoteError) console.error("Could not load post upvote counts:", upvoteError);
  if (commentError) console.error("Could not load post comment counts:", commentError);

  const upvoteCounts = new Map();
  const commentCounts = new Map();

  (upvotes || []).forEach((row) => {
    upvoteCounts.set(row.post_id, (upvoteCounts.get(row.post_id) || 0) + 1);
  });

  (comments || []).forEach((row) => {
    commentCounts.set(row.post_id, (commentCounts.get(row.post_id) || 0) + 1);
  });

  return rows.map((row) => ({
    ...row,
    upvote_count: upvoteCounts.get(row.id) || row.upvote_count || 0,
    comment_count: commentCounts.get(row.id) || row.comment_count || 0,
  }));
}

async function hydrateTablePosts(supabase, rows = []) {
  const withProfiles = await attachProfilesToPosts(supabase, rows || []);
  return attachCountsToPosts(supabase, withProfiles);
}

async function listPostsFromTable(supabase, limit) {
  const result = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: await hydrateTablePosts(supabase, result.data || []),
    error: result.error,
  };
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

  // Always trust public.posts first because it guarantees the real public.posts.id.
  const tableResult = await listPostsFromTable(supabase, limit);
  if (!tableResult.error && tableResult.data.length > 0) return tableResult;

  const viewResult = await listPostsFromView(supabase, limit);
  if (!viewResult.error && viewResult.data.length > 0) return viewResult;

  const rpcResult = await listPostsFromRpc(supabase, limit);
  if (!rpcResult.error && rpcResult.data.length > 0) return rpcResult;

  if (!tableResult.error && !viewResult.error && !rpcResult.error) {
    return { data: [], error: null };
  }

  return {
    data: tableResult.data.length
      ? tableResult.data
      : viewResult.data.length
        ? viewResult.data
        : rpcResult.data,
    error: tableResult.error || viewResult.error || rpcResult.error,
  };
}

async function listMyPostsFromTable(supabase, userId, limit) {
  const result = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: await hydrateTablePosts(supabase, result.data || []),
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
    .from("posts")
    .select(POST_SELECT)
    .eq("status", "reported")
    .order("created_at", { ascending: false })
    .limit(50);

  return { data: await hydrateTablePosts(supabase, data || []), error };
}

export async function createPost({ category, title, body, anonymous }) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { user, profile, error: authError } = await getAuthUserAndProfile(supabase);

  if (authError || !user) {
    console.error("Create post auth error:", authError);
    return {
      data: null,
      error: authError || { message: "Please log in again before posting." },
    };
  }

  const profileStatus = getProfileStatus(profile);

  if (!profile || profileStatus !== "verified") {
    return {
      data: null,
      error: { message: "Your profile must be verified before you can post." },
    };
  }

  const payload = {
    author_id: user.id,
    author_name_cached: profile.full_name || user.email || "Member",
    author_color_cached: profile.avatar_color || "#314A66",
    category: category || "General Q&A",
    title: title?.trim() || "Untitled post",
    body: body?.trim() || "",
    anonymous: Boolean(anonymous),
    status: "active",
    edited: false,
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(payload)
    .select(POST_SELECT)
    .single();

  if (error) {
    console.error("Create post failed:", error, payload);
    return { data: null, error };
  }

  const normalized = await hydrateTablePosts(supabase, [data]);

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

  const { user, error: authError } = await getAuthUserAndProfile(supabase);

  if (authError || !user) {
    return {
      data: null,
      error: authError || { message: "Please log in again before editing your post." },
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

  const { data, error } = await supabase
    .from("posts")
    .update(allowed)
    .eq("id", resolvedPostId)
    .eq("author_id", user.id)
    .select(POST_SELECT)
    .maybeSingle();

  if (error) {
    console.error("Update post failed:", error);
    return { data: null, error };
  }

  if (!data) {
    return {
      data: null,
      error: {
        message:
          "Post was not updated. This post may not belong to your account, or the post id coming from the UI does not match posts.id.",
      },
    };
  }

  const normalized = await hydrateTablePosts(supabase, [data]);

  return {
    data: normalized[0] || null,
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

  const { user, error: authError } = await getAuthUserAndProfile(supabase);

  if (authError || !user) {
    return {
      data: null,
      error: authError || { message: "Please log in again before deleting your post." },
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
    .eq("author_id", user.id)
    .select("id");

  if (error) {
    console.error("Delete post failed:", error);
    return { data: null, error, deleted: false };
  }

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

  if (error) console.error("Restore reported post failed:", error);

  return { data, error };
}

export async function listMyUpvotedPostIds(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("upvotes")
    .select("post_id")
    .eq("user_id", userId);

  if (error) console.error("List my upvotes failed:", error);

  return { data: (data || []).map((r) => r.post_id), error };
}

export async function addUpvote(postId, userId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const resolvedPostId = resolvePostId(postId);

  const { data, error } = await supabase
    .from("upvotes")
    .insert([{ post_id: resolvedPostId, user_id: userId }])
    .select("post_id, user_id")
    .maybeSingle();

  if (error) console.error("Add upvote failed:", error);

  return { data, error };
}

export async function removeUpvote(postId, userId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const resolvedPostId = resolvePostId(postId);

  const { error } = await supabase
    .from("upvotes")
    .delete()
    .eq("post_id", resolvedPostId)
    .eq("user_id", userId);

  if (error) console.error("Remove upvote failed:", error);

  return { error };
}

export async function listMyReportedPostIds(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("reports")
    .select("post_id")
    .eq("user_id", userId);

  if (error) console.error("List my reports failed:", error);

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

    if (error) console.error("Report post failed:", error);

    return { data, error };
  }

  const visitorKey = getVisitorKey();

  const { data, error } = await supabase.rpc("create_visitor_report", {
    p_post_id: resolvedPostId,
    p_visitor_key: visitorKey,
    p_reason: reason,
  });

  if (error) console.error("Visitor report post failed:", error);

  return { data, error };
}
