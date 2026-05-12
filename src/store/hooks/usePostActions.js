import { useCallback } from "react";
import { uid } from "@/lib/helpers";
import * as PostsDB from "@/lib/db/posts";
import * as CommentsDB from "@/lib/db/comments";
import { getPostId, getProfileStatus } from "../utils/appHelpers";

const FEED_CACHE_KEY = "soldierhub_feed_cache_v1";

function removePostFromList(list = [], postId) {
  return (list || []).filter((post) => getPostId(post) !== postId);
}

function updatePostInList(list = [], postId, updater) {
  return (list || []).map((post) =>
    getPostId(post) === postId ? updater(post) : post
  );
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

    window.localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({ ...parsed, posts: nextPosts, savedAt: Date.now() })
    );
  } catch {
    window.localStorage.removeItem(FEED_CACHE_KEY);
  }
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

    if (SUPA) {
      const { error } = await PostsDB.createPost({
        id,
        author_id: currentUser.id,
        category,
        title,
        body,
        anonymous,
      });
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }
      pushToast("Posted to feed", "success");
      await reloadPosts();
      await reloadMyPosts();
      return { ok: true };
    }

    const post = {
      id: id || uid(),
      category,
      title,
      body,
      anonymous,
      author_id: currentUser.id,
      author_name: anonymous ? null : currentUser.full_name,
      author_color: anonymous ? null : currentUser.avatar_color,
      upvote_count: 0,
      comment_count: 0,
      report_count: 0,
      status: "active",
      edited: false,
      created_at: new Date().toISOString(),
    };

    setPosts((p) => [post, ...p]);
    setMyPosts((p) => [post, ...p]);
    pushToast("Posted to feed", "success");
    return { ok: true };
  };

  const upvotePost = async (postId) => {
    if (!requireAuth()) return;

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
    setPosts((arr) => updatePostInList(arr, postId, applyDelta));
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
        setPosts((arr) => updatePostInList(arr, postId, rollbackDelta));
        setMyPosts((arr) => updatePostInList(arr, postId, rollbackDelta));
        pushToast(error.message, "error");
      }
    }
  };

  const reportPost = async (postId) => {
    if (!requireAuth()) return;
    if (myReports.has(postId)) return;

    setMyReports((s) => new Set(s).add(postId));
    setPosts((arr) =>
      updatePostInList(arr, postId, (p) => ({
        ...p,
        report_count: (p.report_count || 0) + 1,
        status: "reported",
      }))
    );
    setMyPosts((arr) =>
      updatePostInList(arr, postId, (p) => ({
        ...p,
        report_count: (p.report_count || 0) + 1,
        status: "reported",
      }))
    );

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
        setPosts((arr) => updatePostInList(arr, postId, rollbackReport));
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

    const incrementReplyCount = (post) => ({
      ...post,
      comment_count: (post.comment_count || 0) + 1,
      reply_count: (post.reply_count || post.comment_count || 0) + 1,
    });

    if (SUPA) {
      const { data, error } = await CommentsDB.createComment({
        post_id: postId,
        author_id: currentUser.id,
        body,
      });

      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      setPostComments((m) => ({
        ...m,
        [postId]: [...(m[postId] || []), data],
      }));
      setPosts((arr) => updatePostInList(arr, postId, incrementReplyCount));
      setMyPosts((arr) => updatePostInList(arr, postId, incrementReplyCount));
      return { ok: true };
    }

    const newComment = {
      id: uid(),
      post_id: postId,
      author_id: currentUser.id,
      body,
      created_at: new Date().toISOString(),
      author_name_cached: currentUser.full_name,
      author_color_cached: currentUser.avatar_color,
    };

    setPostComments((m) => ({
      ...m,
      [postId]: [...(m[postId] || []), newComment],
    }));
    setPosts((arr) => updatePostInList(arr, postId, incrementReplyCount));
    setMyPosts((arr) => updatePostInList(arr, postId, incrementReplyCount));

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
          comment_id: newComment.id,
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
    async (postId) => {
      if (!SUPA) return;
      if (postComments[postId]) return;
      const { data } = await CommentsDB.listCommentsForPost(postId);
      setPostComments((m) => ({ ...m, [postId]: data || [] }));
    },
    [SUPA, postComments, setPostComments]
  );

  const editMyPost = async (postId, updates) => {
    if (!requireAuth()) {
      return { ok: false, error: "You must be verified to edit posts." };
    }

    if (SUPA) {
      const { error } = await PostsDB.updateMyPost(postId, updates);
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }
      pushToast("Post updated", "success");
      await reloadPosts();
      await reloadMyPosts();
      return { ok: true };
    }

    setPosts((arr) =>
      updatePostInList(arr, postId, (p) => ({ ...p, ...updates, edited: true }))
    );
    setMyPosts((arr) =>
      updatePostInList(arr, postId, (p) => ({ ...p, ...updates, edited: true }))
    );
    pushToast("Post updated", "success");
    return { ok: true };
  };

  const deleteMyPost = async (postId) => {
    if (!requireAuth()) return { ok: false, error: "Not authorized." };

    if (!postId) {
      return { ok: false, error: "Post was not identified. Please refresh and try again." };
    }

    if (SUPA) {
      const { error } = await PostsDB.deletePost(postId);
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

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

      await reloadPosts();
      await reloadMyPosts();

      pushToast("Post deleted", "success");
      return { ok: true };
    }

    setPosts((arr) => removePostFromList(arr, postId));
    setMyPosts((arr) => removePostFromList(arr, postId));
    setNotifications((n) => n.filter((x) => x.post_id !== postId));
    setPostComments((map) => {
      const next = { ...(map || {}) };
      delete next[postId];
      return next;
    });
    removeCachedFeedPost(postId);
    pushToast("Post deleted", "success");
    return { ok: true };
  };

  return {
    createPost,
    upvotePost,
    reportPost,
    commentOnPost,
    loadCommentsForPost,
    editMyPost,
    deleteMyPost,
  };
}
