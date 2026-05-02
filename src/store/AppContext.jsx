"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { ADMIN_EMAIL } from "@/lib/constants";
import { SEED_PENDING, SEED_POSTS, SEED_USERS } from "@/lib/seed";
import { colorFromString, uid } from "@/lib/helpers";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";
import * as PostsDB from "@/lib/db/posts";
import * as CommentsDB from "@/lib/db/comments";
import * as NotificationsDB from "@/lib/db/notifications";
import {
  subscribeToMyNotifications,
  subscribeToPosts,
} from "@/lib/db/realtime";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const SUPA = isSupabaseConfigured();

/**
 * AppProvider — single source of truth.
 *
 * Two modes:
 *   • Demo mode (no env vars set): uses seed data, password "demo".
 *   • Live mode (Supabase configured): real auth + database + realtime.
 *
 * Components consume `useApp()` and don't need to know which mode is active.
 */
export function AppProvider({ children }) {
  const router = useRouter();

  // ─── Data ─────────────────────────────────────────────────────────────
  const [users, setUsers] = useState(SUPA ? [] : SEED_USERS);
  const [pendingUsers, setPendingUsers] = useState(SUPA ? [] : SEED_PENDING);
  const [posts, setPosts] = useState(SUPA ? [] : normalizeSeedPosts(SEED_POSTS));
  const [myPosts, setMyPosts] = useState([]);
  const [postComments, setPostComments] = useState({});
  const [myUpvotes, setMyUpvotes] = useState(new Set());
  const [myReports, setMyReports] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  // ─── Session ──────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(SUPA);
  const [postsLoading, setPostsLoading] = useState(SUPA);

  // ─── UI ───────────────────────────────────────────────────────────────
  const [authModal, setAuthModal] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // ─── Toasts ───────────────────────────────────────────────────────────
  const pushToast = useCallback((text, tone = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // ═════════════════════════════════════════════════════════════════════
  // SESSION & DATA LOADING
  // ═════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!SUPA) return;

    let unsubscribe;
    let cancelled = false;

    (async () => {
      const { profile } = await Auth.getCurrentUser();

      if (!cancelled) {
        setCurrentUser(profile);
        setAuthLoading(false);
      }
    })();

    unsubscribe = Auth.onAuthChange(async (user) => {
      if (!user) {
        setCurrentUser(null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);
        return;
      }

      const { data: profile } = await ProfilesDB.getProfile(user.id);
      setCurrentUser(profile || null);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  const reloadPosts = useCallback(async () => {
    if (!SUPA) return;

    setPostsLoading(true);

    const { data } = await PostsDB.listPosts();

    setPosts(data || []);
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    if (SUPA) reloadPosts();
  }, [reloadPosts]);

  useEffect(() => {
    if (!SUPA) return;

    const unsubscribe = subscribeToPosts(() => reloadPosts());

    return () => unsubscribe();
  }, [reloadPosts]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;

    let cancelled = false;

    (async () => {
      const [{ data: ups }, { data: reps }, { data: notifs }, { data: mine }] =
        await Promise.all([
          PostsDB.listMyUpvotedPostIds(currentUser.id),
          PostsDB.listMyReportedPostIds(currentUser.id),
          NotificationsDB.listMyNotifications(currentUser.id),
          PostsDB.listMyPosts(currentUser.id),
        ]);

      if (cancelled) return;

      setMyUpvotes(new Set(ups));
      setMyReports(new Set(reps));
      setNotifications(notifs);
      setMyPosts(mine || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const reloadMyPosts = useCallback(async () => {
    if (!SUPA || !currentUser) return;

    const { data } = await PostsDB.listMyPosts(currentUser.id);

    setMyPosts(data || []);
  }, [currentUser]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;

    const unsubscribe = subscribeToMyNotifications(currentUser.id, async () => {
      const { data } = await NotificationsDB.listMyNotifications(currentUser.id);
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const reloadPendingUsers = useCallback(async () => {
    if (!SUPA) return;

    const { data } = await ProfilesDB.listPendingProfiles();

    setPendingUsers(data || []);
  }, []);

  const reloadVerifiedUsers = useCallback(async () => {
    if (!SUPA) return;

    const { data } = await ProfilesDB.listVerifiedProfiles();

    setUsers(data || []);
  }, []);

  useEffect(() => {
    if (SUPA && currentUser?.role === "admin") {
      reloadPendingUsers();
      reloadVerifiedUsers();
    }
  }, [currentUser, reloadPendingUsers, reloadVerifiedUsers]);

  // ═════════════════════════════════════════════════════════════════════
  // AUTH
  // ═════════════════════════════════════════════════════════════════════

  const handleSignup = async ({
    name,
    email,
    militaryEmail,
    phone,
    bio,
    password,
  }) => {
    const cleanName = name?.trim() || "";
    const cleanEmail = email?.trim().toLowerCase() || "";
    const cleanMilitaryEmail = militaryEmail?.trim().toLowerCase() || "";
    const cleanPhone = phone?.trim() || "";
    const cleanBio = bio?.trim() || "";

    if (SUPA) {
      const { data, error } = await Auth.signUp({
        email: cleanEmail,
        password,
        fullName: cleanName,
        militaryEmail: cleanMilitaryEmail,
        phone: cleanPhone,
        bio: cleanBio,
        avatarColor: colorFromString(cleanName),
      });

      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      pushToast(
        "Account created. Please check your email to confirm your address.",
        "info"
      );

      setAuthModal(null);

      router.push(
        `/pending-review?email=${encodeURIComponent(
          cleanEmail
        )}&name=${encodeURIComponent(cleanName)}&found=1`
      );

      return { ok: true, data };
    }

    // ─── Demo mode ───────────────────────────────────────────────────
    const newUser = {
      id: uid(),
      full_name: cleanName,
      email: cleanEmail,
      personal_email: cleanEmail,
      military_email: cleanMilitaryEmail || null,
      phone: cleanPhone || null,
      bio: cleanBio,
      password,
      role: cleanEmail === ADMIN_EMAIL ? "admin" : "user",
      status: cleanEmail === ADMIN_EMAIL ? "verified" : "pending",
      verification_status: cleanEmail === ADMIN_EMAIL ? "verified" : "pending",
      avatar_color: colorFromString(cleanName),
      base: "Fort Bliss",
      created_at: new Date().toISOString(),
    };

    if (cleanEmail === ADMIN_EMAIL) {
      setUsers((u) => [...u, newUser]);
      setCurrentUser(newUser);
      setAuthModal(null);
      pushToast("Welcome, admin", "success");
    } else {
      setPendingUsers((u) => [...u, newUser]);
      setAuthModal(null);
      pushToast("Profile submitted for review", "success");

      router.push(
        `/pending-review?email=${encodeURIComponent(
          cleanEmail
        )}&name=${encodeURIComponent(cleanName)}&found=1`
      );
    }

    return { ok: true };
  };

  const handleLogin = async (email, password, onError) => {
    if (SUPA) {
      const { data, error } = await Auth.signIn({ email, password });

      if (error) {
        onError && onError(error.message);
        return;
      }

      const { data: profile } = await ProfilesDB.getProfile(data.user.id);
      const profileStatus = profile?.status || profile?.verification_status;

      if (profileStatus !== "verified") {
        setAuthModal(null);

        router.push(
          `/pending-review?email=${encodeURIComponent(
            email
          )}&name=${encodeURIComponent(profile?.full_name || "")}&found=1`
        );
      } else {
        setAuthModal(null);
        pushToast(`Signed in as ${profile.full_name}`, "success");
      }

      return;
    }

    // ─── Demo mode ───────────────────────────────────────────────────
    const verified = users.find((u) => u.email === email);
    const pending = pendingUsers.find((u) => u.email === email);

    if (verified) {
      if (verified.password && verified.password !== password) {
        return onError && onError("Incorrect password.");
      }

      setCurrentUser(verified);
      setAuthModal(null);
      pushToast(`Signed in as ${verified.full_name}`, "success");
    } else if (pending) {
      if (pending.password && pending.password !== password) {
        return onError && onError("Incorrect password.");
      }

      setAuthModal(null);

      router.push(
        `/pending-review?email=${encodeURIComponent(
          email
        )}&name=${encodeURIComponent(pending.full_name)}&found=1`
      );
    } else {
      setAuthModal(null);
      router.push(`/pending-review?email=${encodeURIComponent(email)}&found=0`);
    }
  };

  const handleLogout = async () => {
    if (SUPA) await Auth.signOut();

    setCurrentUser(null);
    pushToast("Signed out", "info");
    router.push("/");
  };

  const requireAuth = () => {
    if (!currentUser) {
      setAuthModal("login");
      return false;
    }

    const userStatus = currentUser.status || currentUser.verification_status;

    if (userStatus !== "verified") {
      const userEmail = currentUser.email || currentUser.personal_email || "";

      router.push(
        `/pending-review?email=${encodeURIComponent(
          userEmail
        )}&name=${encodeURIComponent(currentUser.full_name || "")}&found=1`
      );

      return false;
    }

    return true;
  };

  // ═════════════════════════════════════════════════════════════════════
  // POSTS
  // ═════════════════════════════════════════════════════════════════════

  const createPost = async ({ title, body, category, anonymous }) => {
    if (SUPA) {
      const { error } = await PostsDB.createPost({
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
      id: uid(),
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
    pushToast("Posted to feed", "success");

    return { ok: true };
  };

  const upvotePost = async (postId) => {
    const has = myUpvotes.has(postId);

    setMyUpvotes((s) => {
      const n = new Set(s);
      has ? n.delete(postId) : n.add(postId);
      return n;
    });

    setPosts((arr) =>
      arr.map((p) =>
        p.id === postId
          ? { ...p, upvote_count: (p.upvote_count || 0) + (has ? -1 : 1) }
          : p
      )
    );

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

        setPosts((arr) =>
          arr.map((p) =>
            p.id === postId
              ? { ...p, upvote_count: (p.upvote_count || 0) + (has ? 1 : -1) }
              : p
          )
        );

        pushToast(error.message, "error");
      }
    }
  };

  const reportPost = async (postId) => {
    if (myReports.has(postId)) return;

    setMyReports((s) => new Set(s).add(postId));

    setPosts((arr) =>
      arr.map((p) =>
        p.id === postId
          ? {
              ...p,
              report_count: (p.report_count || 0) + 1,
              status: "reported",
            }
          : p
      )
    );

    if (SUPA) {
      const userStatus = currentUser?.status || currentUser?.verification_status;
      const verifiedUserId = userStatus === "verified" ? currentUser.id : null;

      const { data, error } = await PostsDB.reportPost(postId, verifiedUserId);

      if (error || data?.ok === false) {
        setMyReports((s) => {
          const n = new Set(s);
          n.delete(postId);
          return n;
        });

        setPosts((arr) =>
          arr.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  report_count: Math.max((p.report_count || 1) - 1, 0),
                }
              : p
          )
        );

        pushToast(
          error?.message || data?.error || "Could not report post.",
          "error"
        );

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

      setPosts((arr) =>
        arr.map((p) =>
          p.id === postId
            ? { ...p, comment_count: (p.comment_count || 0) + 1 }
            : p
        )
      );

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

    setPosts((arr) =>
      arr.map((p) => {
        if (p.id !== postId) return p;

        return { ...p, comment_count: (p.comment_count || 0) + 1 };
      })
    );

    const post = posts.find((p) => p.id === postId);

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
    [postComments]
  );

  const editMyPost = async (postId, updates) => {
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
      arr.map((p) => (p.id === postId ? { ...p, ...updates, edited: true } : p))
    );

    pushToast("Post updated", "success");

    return { ok: true };
  };

  const deleteMyPost = async (postId) => {
    if (SUPA) {
      const { error } = await PostsDB.deletePost(postId);

      if (error) return pushToast(error.message, "error");

      setPosts((arr) => arr.filter((p) => p.id !== postId));
      setMyPosts((arr) => arr.filter((p) => p.id !== postId));

      pushToast("Post deleted", "success");

      return;
    }

    setPosts((arr) => arr.filter((p) => p.id !== postId));
    setNotifications((n) => n.filter((x) => x.post_id !== postId));

    pushToast("Post deleted", "success");
  };

  // ═════════════════════════════════════════════════════════════════════
  // ADMIN
  // ═════════════════════════════════════════════════════════════════════

  const verifyUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminVerifyProfile(profileId);

      if (error) return pushToast(error.message, "error");

      const verified = pendingUsers.find((p) => p.id === profileId);

      pushToast(`Verified ${verified?.full_name || "user"}`, "success");

      reloadPendingUsers();
      reloadVerifiedUsers();

      return;
    }

    const u = pendingUsers.find((x) => x.id === profileId);

    if (!u) return;

    setUsers((list) => [
      ...list,
      {
        ...u,
        status: "verified",
        verification_status: "verified",
      },
    ]);

    setPendingUsers((list) => list.filter((x) => x.id !== profileId));
    pushToast(`Verified ${u.full_name}`, "success");
  };

  const rejectUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminRejectProfile(profileId);

      if (error) return pushToast(error.message, "error");

      pushToast("User rejected", "info");
      reloadPendingUsers();

      return;
    }

    setPendingUsers((list) => list.filter((x) => x.id !== profileId));
    pushToast("User rejected", "info");
  };

  const removeUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminRemoveProfile(profileId);

      if (error) return pushToast(error.message, "error");

      pushToast("Member access revoked", "info");
      reloadVerifiedUsers();

      return;
    }

    setUsers((list) => list.filter((u) => u.id !== profileId));
    pushToast("Member access revoked", "info");
  };

  const adminDeletePost = async (postId) => {
    if (SUPA) {
      const { error } = await PostsDB.deletePost(postId);

      if (error) return pushToast(error.message, "error");

      pushToast("Post permanently deleted", "info");
      reloadPosts();

      return;
    }

    setPosts((arr) => arr.filter((p) => p.id !== postId));
    pushToast("Post permanently deleted", "info");
  };

  const restoreReportedPost = async (postId) => {
    if (SUPA) {
      const { error } = await PostsDB.restoreReportedPost(postId);

      if (error) return pushToast(error.message, "error");

      pushToast("Post sent back to feed", "success");
      reloadPosts();

      return;
    }

    setPosts((arr) =>
      arr.map((p) =>
        p.id === postId
          ? {
              ...p,
              status: "active",
              report_count: 0,
            }
          : p
      )
    );

    pushToast("Post sent back to feed", "success");
  };

  // ═════════════════════════════════════════════════════════════════════
  // PROFILE
  // ═════════════════════════════════════════════════════════════════════

  const updateProfile = async (updates) => {
    if (SUPA) {
      const { data, error } = await ProfilesDB.updateMyProfile(
        currentUser.id,
        updates
      );

      if (error) return pushToast(error.message, "error");

      setCurrentUser(data);
      pushToast("Profile updated", "success");

      return;
    }

    setCurrentUser((u) => ({ ...u, ...updates }));

    setUsers((arr) =>
      arr.map((u) => (u.id === currentUser.id ? { ...u, ...updates } : u))
    );

    pushToast("Profile updated", "success");
  };

  // ═════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═════════════════════════════════════════════════════════════════════

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];

    if (SUPA) return notifications;

    return notifications
      .filter((n) => n.recipient_user_id === currentUser.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [notifications, currentUser]);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const markNotificationsRead = useCallback(async () => {
    if (!currentUser) return;

    if (SUPA) {
      await NotificationsDB.markAllNotificationsRead(currentUser.id);

      setNotifications((arr) => arr.map((n) => ({ ...n, read: true })));

      return;
    }

    setNotifications((arr) =>
      arr.map((n) =>
        n.recipient_user_id === currentUser.id ? { ...n, read: true } : n
      )
    );
  }, [currentUser]);

  // ═════════════════════════════════════════════════════════════════════
  // PROVIDER
  // ═════════════════════════════════════════════════════════════════════

  const userPosts = useMemo(() => {
    if (!currentUser) return [];

    if (SUPA) return myPosts;

    return posts.filter((p) => p.author_id === currentUser.id);
  }, [currentUser, posts, myPosts]);

  const value = {
    // Mode flag
    isLiveMode: SUPA,

    // Loading
    authLoading,
    postsLoading,

    // Data
    users,
    pendingUsers,
    posts,
    myPosts: userPosts,
    postComments,
    myUpvotes,
    myReports,
    notifications: userNotifications,
    unreadCount,

    // Cache loaders
    loadCommentsForPost,

    // Session
    currentUser,
    requireAuth,

    // UI
    authModal,
    setAuthModal,
    mobileMenu,
    setMobileMenu,
    toasts,
    pushToast,
    dismissToast,
    search,
    setSearch,
    category,
    setCategory,

    // Auth
    handleSignup,
    handleLogin,
    handleLogout,

    // Posts
    createPost,
    upvotePost,
    reportPost,
    commentOnPost,
    editMyPost,
    deleteMyPost,

    // Admin
    verifyUser,
    rejectUser,
    removeUser,
    adminDeletePost,
    restoreReportedPost,

    // Profile
    updateProfile,

    // Notifications
    markNotificationsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function normalizeSeedPosts(seedPosts) {
  return seedPosts.map((p) => ({
    ...p,
    author_color: colorFromString(p.author_name),
    upvote_count: p.upvotes || 0,
    comment_count: (p.comments || []).length,
    report_count: p.reportCount || 0,
    created_at:
      typeof p.created_at === "number"
        ? new Date(p.created_at).toISOString()
        : p.created_at,
  }));
}