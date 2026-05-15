import { useCallback } from "react";
import { uid } from "@/lib/helpers";
import * as PostsDB from "@/lib/db/posts";
import * as CommentsDB from "@/lib/db/comments";
import {
  checkClientActionLimit,
  formatRetryMessage,
} from "@/lib/rateLimit/clientActionLimiter";
import { getPostId, getProfileStatus } from "../utils/appHelpers";

const FEED_CACHE_KEY = "soldierhub_feed_cache_v2";
const COMMENT_CACHE_PREFIX = "soldierhub_comment_cache_v1:";
const COMMENT_CACHE_MAX_AGE_MS = 1000 * 60 * 5;

function removePostFromList(list = [], postId) {
  return (list || []).filter((post) => getPostId(post) !== postId);
}

function updatePostInList(list = [], postId, updater) {
  return (list || []).map((post) =>
    getPostId(post) === postId ? updater(post) : post
  );
}

function addPostToTop(list = [], post = {}) {
  const postId = getPostId(post);
  if (!postId) return list || [];
  return [post, ...removePostFromList(list, postId)];
}

function normalizeCreatedPostForState(row = {}, currentUser, fallback = {}) {
  const postId = getPostId(row) || fallback.id || uid();
  const isAnonymous = Boolean(row.anonymous ?? fallback.anonymous);
  const commentCount = row.comment_count ?? row.comments_count ?? row.reply_count ?? 0;

  return {
    ...row,
    id: postId,
    post_id: postId,
    category: row.category || fallback.category || "General Q&A",
    title: row.title || fallback.title || "",
    body: row.body ?? fallback.body ?? "",
    anonymous: isAnonymous,
    author_id: row.author_id || currentUser?.id || null,
    author_name: row.author_name || row.author_name_cached || currentUser?.full_name || "Member",
    author_color: row.author_color || row.author_color_cached || currentUser?.avatar_color || "#314A66",
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: commentCount,
    reply_count: row.reply_count ?? commentCount,
    report_count: row.report_count ?? 0,
    status: row.status || "active",
    edited: Boolean(row.edited),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function makeFeedSafePost(post = {}) {
  if (!post.anonymous) return post;

  return {
    ...post,
    author_id: null,
    author_user_id: null,
    user_id: null,
    profile_id: null,
    author_name: null,
    author_color: null,
    author_name_cached: null,
    author_color_cached: null,
  };
}

function decrementCommentCount(post) {
  const currentCommentCount = post.comment_count ?? post.reply_count ?? 0;

  return {
    ...post,
    comment_count: Math.max(currentCommentCount - 1, 0),
    reply_count: Math.max((post.reply_count ?? currentCommentCount) - 1, 0),
  };
}

function incrementCommentCount(post) {
  const currentCommentCount = post.comment_count ?? post.reply_count ?? 0;

  return {
    ...post,
    comment_count: currentCommentCount + 1,
    reply_count: (post.reply_count ?? currentCommentCount) + 1,
  };
}

function getCommentId(comment = {}) {
  return comment?.id || comment?.comment_id || comment?.commentId || null;
}

function getCommentAuthorId(comment = {}) {
  return (
    comment?.author_id ||
    comment?.author_user_id ||
    comment?.comment_author_id ||
    comment?.comment_author_user_id ||
    comment?.user_id ||
    comment?.profile_id ||
    comment?.created_by ||
    comment?.actor_user_id ||
    comment?.actor_id ||
    comment?.author?.id ||
    comment?.profile?.id ||
    comment?.user?.id ||
    null
  );
}

function viewerOwnsComment(comment = {}, currentUser) {
  const authorId = getCommentAuthorId(comment);

  return Boolean(
    currentUser?.id &&
      (authorId === currentUser.id ||
        comment?.viewer_is_author === true ||
        comment?.viewer_is_owner === true ||
        comment?.viewer_owns_comment === true ||
        comment?.viewer_can_delete === true ||
        comment?.can_delete === true ||
        comment?.is_mine === true)
  );
}

function removeCommentFromMap(map = {}, postId, commentId) {
  return {
    ...map,
    [postId]: (map[postId] || []).filter((comment) => getCommentId(comment) !== commentId),
  };
}

function getLimitIdentity(currentUser) {
  return currentUser?.id || currentUser?.email || "guest";
}

function stopIfLimited({ action, currentUser, pushToast }) {
  const result = checkClientActionLimit(action, getLimitIdentity(currentUser));

  if (result.allowed) return false;

  pushToast(formatRetryMessage(result.retryAfterMs), "error");
  return true;
}

function writeCachedFeedPosts(posts = []) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({ posts: posts.slice(0, 30), savedAt: Date.now() })
    );
  } catch {
    // Cache is a performance helper only.
  }
}

function updateCachedFeedPost(postId, updater) {
  if (typeof window === "undefined" || !postId) return;

  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const nextPosts = updatePostInList(posts, postId, updater);

    window.localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({ ...parsed, posts: nextPosts, savedAt: Date.now() })
    );
  } catch {
    window.localStorage.removeItem(FEED_CACHE_KEY);
  }
}

function removeCachedFeedPost(postId) {
  if (typeof window === "undefined" || !postId) return;

  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const nextPosts = removePostFromList(posts, postId);

    if (nextPosts.length === 0) {
      window.localStorage.removeItem(FEED_CACHE_KEY);
      return;
    }

    writeCachedFeedPosts(nextPosts);
  } catch {
    window.localStorage.removeItem(FEED_CACHE_KEY);
  }
}

function readCachedComments(postId) {
  if (typeof window === "undefined" || !postId) return null;

  try {
    const raw = window.localStorage.getItem(`${COMMENT_CACHE_PREFIX}${postId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const comments = Array.isArray(parsed?.comments) ? parsed.comments : [];
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > COMMENT_CACHE_MAX_AGE_MS) return null;
    return comments;
  } catch {
    window.localStorage.removeItem(`${COMMENT_CACHE_PREFIX}${postId}`);
    return null;
  }
}

function writeCachedComments(postId, comments = []) {
  if (typeof window === "undefined" || !postId) return;

  try {
    window.localStorage.setItem(
      `${COMMENT_CACHE_PREFIX}${postId}`,
      JSON.stringify({ comments, savedAt: Date.now() })
    );
  } catch {
    // Cache is a performance helper only.
  }
}

function removeCachedComments(postId) {
  if (typeof window === "undefined" || !postId) return;
  window.localStorage.removeItem(`${COMMENT_CACHE_PREFIX}${postId}`);
}

function hasLoadedComments(postComments = {}, postId) {
  return Object.prototype.hasOwnProperty.call(postComments || {}, postId);
}

function refreshCommentsInBackground(postId, setPostComments) {
  if (!postId) return;

  CommentsDB.listCommentsForPost(postId)
    .then(({ data }) => {
      const comments = data || [];
      writeCachedComments(postId, comments);
      setPostComments((m) => ({ ...m, [postId]: comments }));
    })
    .catch(() => {
      // Background refresh should never block the visible reply section.
    });
}

export function usePostActions({
  SUPA,
  currentUser,
  posts,
  setPosts,
  setMyPosts,
  postComments,
  setPostComments,
  myUpvotes,
  setMyUpvotes,
  myReports,
  setMyReports,
  setNotifications,
  requireAuth,
  pushToast,
  reloadPosts,
  reloadMyPosts,
}) {
  const createPost = async ({ id, title, body, category, anonymous }) => {
    if (!requireAuth()) return { ok: false, error: "You must be verified to post." };

    if (stopIfLimited({ action: "post", currentUser, pushToast })) {
      return { ok: false, error: "Please slow down before posting again." };
    }

    if (SUPA) {
      const { data, error } = await PostsDB.createPost({
        category,
        title,
        body,
        anonymous,
      });

      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      const savedPost = normalizeCreatedPostForState(data, currentUser, {
        id,
        title,
        body,
        category,
        anonymous,
      });
      const feedPost = makeFeedSafePost(savedPost);

      setPosts((arr) => {
        const next = addPostToTop(arr, feedPost);
        writeCachedFeedPosts(next);
        return next;
      });
      setMyPosts((arr) => addPostToTop(arr, savedPost));

      pushToast("Posted to feed", "success");
      reloadPosts?.({ silent: true });
      reloadMyPosts?.();
      return { ok: true };
    }

    const postId = id || uid();
    const optimisticPost = {
      id: postId,
      post_id: postId,
      category,
      title,
      body,
      anonymous,
      author_id: currentUser.id,
      author_name: anonymous ? null : currentUser.full_name,
      author_color: anonymous ? null : currentUser.avatar_color,
      upvote_count: 0,
      comment_count: 0,
      reply_count: 0,
      report_count: 0,
      status: "active",
      edited: false,
      created_at: new Date().toISOString(),
    };

    setPosts((arr) => {
      const next = [optimisticPost, ...arr];
      writeCachedFeedPosts(next);
      return next;
    });
    setMyPosts((arr) => [optimisticPost, ...arr]);

    pushToast("Posted to feed", "success");
    return { ok: true };
  };

  const upvotePost = async (postId) => {
    if (!requireAuth()) return;

    if (stopIfLimited({ action: "upvote", currentUser, pushToast })) return;

    const has = myUpvotes.has(postId);
    const delta = has ? -1 : 1;

    const applyDelta = (post) => ({
      ...post,
      upvote_count: Math.max((post.upvote_count || 0) + delta, 0),
    });

    const rollbackDelta = (post) => ({
      ...post,
      upvote_count: Math.max((post.upvote_count || 0) - delta, 0),
    });

    setMyUpvotes((s) => {
      const n = new Set(s);
      has ? n.delete(postId) : n.add(postId);
      return n;
    });
    setPosts((arr) => {
      const next = updatePostInList(arr, postId, applyDelta);
      writeCachedFeedPosts(next);
      return next;
    });
    setMyPosts((arr) => updatePostInList(arr, postId, applyDelta));

    if (SUPA) {
      const { error } = has
        ? await PostsDB.removeUpvote(postId, currentUser.id)
        : await PostsDB.addUpvote(postId, currentUser.id);

      if (error) {
        setMyUpvotes((s) => {
          const n = new Set(s);
          has ? n.add(postId) : n.delete(postId);
          return n;
        });
        setPosts((arr) => {
          const next = updatePostInList(arr, postId, rollbackDelta);
          writeCachedFeedPosts(next);
          return next;
        });
        setMyPosts((arr) => updatePostInList(arr, postId, rollbackDelta));
        pushToast(error.message, "error");
      }
    }
  };

  const reportPost = async (postId) => {
    if (!requireAuth()) return;
    if (myReports.has(postId)) return;

    if (stopIfLimited({ action: "report", currentUser, pushToast })) return;

    setMyReports((s) => new Set(s).add(postId));
    const applyReport = (p) => ({
      ...p,
      report_count: (p.report_count || 0) + 1,
      status: "reported",
    });
    setPosts((arr) => {
      const next = updatePostInList(arr, postId, applyReport);
      writeCachedFeedPosts(next);
      return next;
    });
    setMyPosts((arr) => updatePostInList(arr, postId, applyReport));

    if (SUPA) {
      const verifiedUserId =
        getProfileStatus(currentUser) === "verified" ? currentUser.id : null;
      const { data, error } = await PostsDB.reportPost(postId, verifiedUserId);

      if (error || data?.ok === false) {
        setMyReports((s) => {
          const n = new Set(s);
          n.delete(postId);
          return n;
        });
        const rollbackReport = (p) => ({
          ...p,
          report_count: Math.max((p.report_count || 1) - 1, 0),
        });
        setPosts((arr) => {
          const next = updatePostInList(arr, postId, rollbackReport);
          writeCachedFeedPosts(next);
          return next;
        });
        setMyPosts((arr) => updatePostInList(arr, postId, rollbackReport));
        pushToast(error?.message || data?.error || "Could not report post.", "error");
        return;
      }

      if (data?.already_reported) {
        pushToast("You already reported this post.", "info");
        return;
      }
    }

    pushToast("Post reported. Admins will review.", "success");
  };

  const commentOnPost = async (postId, body) => {
    if (!requireAuth()) {
      return { ok: false, error: "You must be verified to comment." };
    }

    if (stopIfLimited({ action: "comment", currentUser, pushToast })) {
      return { ok: false, error: "Please slow down before commenting again." };
    }

    const optimisticComment = {
      id: `temp-${uid()}`,
      post_id: postId,
      author_id: currentUser.id,
      body,
      created_at: new Date().toISOString(),
      author_name_cached: currentUser.full_name,
      author_color_cached: currentUser.avatar_color,
      viewer_is_author: true,
    };

    setPostComments((m) => {
      const nextComments = [...(m[postId] || []), optimisticComment];
      writeCachedComments(postId, nextComments);
      return { ...m, [postId]: nextComments };
    });
    setPosts((arr) => {
      const next = updatePostInList(arr, postId, incrementCommentCount);
      writeCachedFeedPosts(next);
      return next;
    });
    setMyPosts((arr) => updatePostInList(arr, postId, incrementCommentCount));

    if (SUPA) {
      const { data, error } = await CommentsDB.createComment({
        post_id: postId,
        author_id: currentUser.id,
        body,
      });

      if (error) {
        setPostComments((m) => {
          const nextComments = (m[postId] || []).filter(
            (item) => getCommentId(item) !== optimisticComment.id
          );
          writeCachedComments(postId, nextComments);
          return { ...m, [postId]: nextComments };
        });
        setPosts((arr) => {
          const next = updatePostInList(arr, postId, decrementCommentCount);
          writeCachedFeedPosts(next);
          return next;
        });
        setMyPosts((arr) => updatePostInList(arr, postId, decrementCommentCount));
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      const savedCommentId = getCommentId(data);
      const savedAuthorId = getCommentAuthorId(data) || currentUser.id;
      const savedComment = {
        ...optimisticComment,
        ...(data || {}),
        id: savedCommentId || optimisticComment.id,
        comment_id: savedCommentId || optimisticComment.id,
        author_id: savedAuthorId,
        author_user_id: savedAuthorId,
        author_name_cached: data?.author_name_cached || optimisticComment.author_name_cached,
        author_color_cached: data?.author_color_cached || optimisticComment.author_color_cached,
        viewer_is_author: true,
      };

      setPostComments((m) => {
        const nextComments = (m[postId] || []).map((item) =>
          getCommentId(item) === optimisticComment.id ? savedComment : item
        );
        writeCachedComments(postId, nextComments);
        return { ...m, [postId]: nextComments };
      });
      return { ok: true };
    }

    const post = posts.find((p) => getPostId(p) === postId);
    if (post && post.author_id !== currentUser.id) {
      setNotifications((n) => [
        {
          id: uid(),
          recipient_user_id: post.author_id,
          actor_user_id: currentUser.id,
          actor_name_cached: currentUser.full_name,
          post_id: postId,
          post_title_cached: post.title,
          comment_id: optimisticComment.id,
          type: "comment",
          read: false,
          created_at: new Date().toISOString(),
        },
        ...n,
      ]);
    }

    return { ok: true };
  };

  const loadCommentsForPost = useCallback(
    async (postId, { force = false } = {}) => {
      if (!SUPA || !postId) return { ok: false, source: "disabled" };

      if (!force && hasLoadedComments(postComments, postId)) {
        return { ok: true, source: "state" };
      }

      if (!force) {
        const cachedComments = readCachedComments(postId);

        if (cachedComments) {
          setPostComments((m) => ({ ...m, [postId]: cachedComments }));
          refreshCommentsInBackground(postId, setPostComments);
          return { ok: true, source: "cache" };
        }
      }

      const { data, error } = await CommentsDB.listCommentsForPost(postId);
      const comments = data || [];

      if (!error) {
        writeCachedComments(postId, comments);
        setPostComments((m) => ({ ...m, [postId]: comments }));
      }

      return { ok: !error, source: "server", error };
    },
    [SUPA, postComments, setPostComments]
  );

  const deleteComment = async ({ postId, commentId }) => {
    if (!requireAuth()) {
      return { ok: false, error: "You must be verified to delete comments." };
    }

    if (!postId || !commentId) {
      return { ok: false, error: "Comment was not identified. Please refresh and try again." };
    }

    const existingComments = postComments?.[postId] || [];
    const existingComment = existingComments.find((item) => getCommentId(item) === commentId);
    const isAdmin = currentUser?.role === "admin";
    const ownsComment = viewerOwnsComment(existingComment, currentUser);

    if (!SUPA && !isAdmin && !ownsComment) {
      return { ok: false, error: "You can only delete your own comment." };
    }

    const previousComments = postComments;

    setPostComments((map) => {
      const nextMap = removeCommentFromMap(map, postId, commentId);
      writeCachedComments(postId, nextMap[postId] || []);
      return nextMap;
    });
    setPosts((arr) => {
      const next = updatePostInList(arr, postId, decrementCommentCount);
      writeCachedFeedPosts(next);
      return next;
    });
    setMyPosts((arr) => updatePostInList(arr, postId, decrementCommentCount));
    setNotifications((arr) => (arr || []).filter((item) => item.comment_id !== commentId));

    if (SUPA) {
      const { error } = await CommentsDB.deleteComment(commentId);

      if (error) {
        setPostComments(previousComments);
        setPosts((arr) => {
          const next = updatePostInList(arr, postId, incrementCommentCount);
          writeCachedFeedPosts(next);
          return next;
        });
        setMyPosts((arr) => updatePostInList(arr, postId, incrementCommentCount));

        pushToast(error.message || "Could not delete comment.", "error");
        return { ok: false, error: error.message || "Could not delete comment." };
      }
    }

    pushToast("Comment deleted", "success");
    return { ok: true };
  };

  const editMyPost = async (postId, updates) => {
    if (!requireAuth()) {
      return { ok: false, error: "You must be verified to edit posts." };
    }

    const previousPosts = posts;
    const applyEdit = (p) => ({ ...p, ...updates, edited: true, updated_at: new Date().toISOString() });

    setPosts((arr) => {
      const next = updatePostInList(arr, postId, applyEdit);
      writeCachedFeedPosts(next);
      return next;
    });
    setMyPosts((arr) => updatePostInList(arr, postId, applyEdit));

    if (SUPA) {
      const { error } = await PostsDB.updateMyPost(postId, updates);
      if (error) {
        setPosts(previousPosts);
        writeCachedFeedPosts(previousPosts);
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }
      pushToast("Post updated", "success");
      reloadPosts?.({ silent: true });
      reloadMyPosts?.();
      return { ok: true };
    }

    pushToast("Post updated", "success");
    return { ok: true };
  };

  const deleteMyPost = async (postId) => {
    if (!requireAuth()) return { ok: false, error: "Not authorized." };

    if (!postId) {
      return { ok: false, error: "Post was not identified. Please refresh and try again." };
    }

    const previousPosts = posts;

    setPosts((arr) => removePostFromList(arr, postId));
    setMyPosts((arr) => removePostFromList(arr, postId));
    setNotifications((arr) => (arr || []).filter((item) => item.post_id !== postId));
    setMyUpvotes((set) => {
      const next = new Set(set);
      next.delete(postId);
      return next;
    });
    setMyReports((set) => {
      const next = new Set(set);
      next.delete(postId);
      return next;
    });
    setPostComments((map) => {
      const next = { ...(map || {}) };
      delete next[postId];
      return next;
    });
    removeCachedFeedPost(postId);
    removeCachedComments(postId);

    if (SUPA) {
      const { error } = await PostsDB.deletePost(postId);
      if (error) {
        setPosts(previousPosts);
        writeCachedFeedPosts(previousPosts);
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      reloadPosts?.({ silent: true });
      reloadMyPosts?.();
      pushToast("Post deleted", "success");
      return { ok: true };
    }

    pushToast("Post deleted", "success");
    return { ok: true };
  };

  return {
    createPost,
    upvotePost,
    reportPost,
    commentOnPost,
    loadCommentsForPost,
    deleteComment,
    editMyPost,
    deleteMyPost,
  };
}
