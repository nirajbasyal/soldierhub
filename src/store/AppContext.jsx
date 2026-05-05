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

export function AppProvider({ children }) {
  const router = useRouter();

  // ─── Data ─────────────────────────────────────────────────────────────
  const [users, setUsers] = useState(SUPA ? [] : SEED_USERS);
  const [pendingUsers, setPendingUsers] = useState(SUPA ? [] : SEED_PENDING);
  const [blockedUsers, setBlockedUsers] = useState([]);
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

  const getProfileStatus = (profile) =>
    profile?.status || profile?.verification_status || "pending";

  const sendToPendingReview = ({
    email = "",
    name = "",
    found = 1,
    status = "pending",
    replace = false,
  }) => {
    const url = `/pending-review?email=${encodeURIComponent(
      email
    )}&name=${encodeURIComponent(name || "")}&found=${found}&status=${encodeURIComponent(
      status
    )}`;

    if (replace) {
      router.replace(url);
    } else {
      router.push(url);
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // SESSION & DATA LOADING
  // ═════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!SUPA) return;

    let unsubscribe;
    let cancelled = false;

    (async () => {
      const { profile } = await Auth.getCurrentUser();

      if (cancelled) return;

      const profileStatus = getProfileStatus(profile);

      if (profileStatus === "rejected" || profileStatus === "revoked") {
        setCurrentUser(profile || null);
        setAuthLoading(false);

        sendToPendingReview({
          email: profile?.email || profile?.personal_email || "",
          name: profile?.full_name || "",
          found: 1,
          status: profileStatus,
          replace: true,
        });

        return;
      }

      setCurrentUser(profile || null);
      setAuthLoading(false);
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
      const profileStatus = getProfileStatus(profile);

      if (profileStatus === "rejected" || profileStatus === "revoked") {
        setCurrentUser(profile || null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);

        sendToPendingReview({
          email: profile?.email || user.email || "",
          name: profile?.full_name || "",
          found: 1,
          status: profileStatus,
          replace: true,
        });

        return;
      }

      setCurrentUser(profile || null);
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
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

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") {
      setMyUpvotes(new Set());
      setMyReports(new Set());
      setNotifications([]);
      setMyPosts([]);
      return;
    }

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
      setNotifications(notifs || []);
      setMyPosts(mine || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const reloadMyPosts = useCallback(async () => {
    if (!SUPA || !currentUser) return;

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") return;

    const { data } = await PostsDB.listMyPosts(currentUser.id);

    setMyPosts(data || []);
  }, [currentUser]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") return;

    const unsubscribe = subscribeToMyNotifications(currentUser.id, async () => {
      const { data } = await NotificationsDB.listMyNotifications(currentUser.id);
      setNotifications(data || []);
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

  const reloadBlockedUsers = useCallback(async () => {
    if (!SUPA) return;

    const { data } = await ProfilesDB.listBlockedProfiles();

    setBlockedUsers(data || []);
  }, []);

  useEffect(() => {
    if (SUPA && currentUser?.role === "admin") {
      reloadPendingUsers();
      reloadVerifiedUsers();
      reloadBlockedUsers();
    }
  }, [
    currentUser,
    reloadPendingUsers,
    reloadVerifiedUsers,
    reloadBlockedUsers,
  ]);

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

      sendToPendingReview({
        email: cleanEmail,
        name: cleanName,
        found: 1,
        status: "pending",
        replace: true,
      });

      setAuthModal(null);

      return { ok: true, data };
    }

    // Demo mode
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
      pushToast("Profile submitted for review", "success");

      sendToPendingReview({
        email: cleanEmail,
        name: cleanName,
        found: 1,
        status: "pending",
        replace: true,
      });

      setAuthModal(null);
    }

    return { ok: true };
  };

  const handleLogin = async (email, password, onError) => {
    const cleanEmail = email?.trim().toLowerCase() || "";

    if (SUPA) {
      const { data, error } = await Auth.signIn({
        email: cleanEmail,
        password,
      });

      if (error) {
        onError && onError(error.message);
        return;
      }

      const { data: profile } = await ProfilesDB.getProfile(data.user.id);

      if (!profile) {
        await Auth.signOut();

        setCurrentUser(null);
        setAuthModal(null);

        router.replace(
          `/pending-review?email=${encodeURIComponent(cleanEmail)}&found=0`
        );

        return;
      }

      const profileStatus = getProfileStatus(profile);

      if (profileStatus === "pending") {
        setCurrentUser(profile);

        sendToPendingReview({
          email: cleanEmail,
          name: profile.full_name || "",
          found: 1,
          status: "pending",
          replace: true,
        });

        setAuthModal(null);

        return;
      }

      if (profileStatus === "rejected") {
        setCurrentUser(profile);

        sendToPendingReview({
          email: cleanEmail,
          name: profile.full_name || "",
          found: 1,
          status: "rejected",
          replace: true,
        });

        setAuthModal(null);

        return;
      }

      if (profileStatus === "revoked") {
        setCurrentUser(profile);

        sendToPendingReview({
          email: cleanEmail,
          name: profile.full_name || "",
          found: 1,
          status: "revoked",
          replace: true,
        });

        setAuthModal(null);

        return;
      }

      if (profileStatus === "verified") {
        setCurrentUser(profile);
        setAuthModal(null);
        pushToast(`Signed in as ${profile.full_name}`, "success");

        return;
      }

      await Auth.signOut();

      setCurrentUser(null);
      setAuthModal(null);

      router.replace(
        `/pending-review?email=${encodeURIComponent(cleanEmail)}&found=0`
      );

      return;
    }

    // Demo mode
    const verified = users.find((u) => u.email === cleanEmail);
    const pending = pendingUsers.find((u) => u.email === cleanEmail);
    const blocked = blockedUsers.find((u) => u.email === cleanEmail);

    if (verified) {
      if (verified.password && verified.password !== password) {
        return onError && onError("Incorrect password.");
      }

      const verifiedStatus = getProfileStatus(verified);

      if (verifiedStatus === "revoked") {
        setCurrentUser(verified);

        sendToPendingReview({
          email: cleanEmail,
          name: verified.full_name || "",
          found: 1,
          status: "revoked",
          replace: true,
        });

        setAuthModal(null);

        return;
      }

      setCurrentUser(verified);
      setAuthModal(null);
      pushToast(`Signed in as ${verified.full_name}`, "success");
    } else if (pending) {
      if (pending.password && pending.password !== password) {
        return onError && onError("Incorrect password.");
      }

      const pendingStatus = getProfileStatus(pending);

      setCurrentUser(pending);

      sendToPendingReview({
        email: cleanEmail,
        name: pending.full_name || "",
        found: 1,
        status: pendingStatus,
        replace: true,
      });

      setAuthModal(null);
    } else if (blocked) {
      if (blocked.password && blocked.password !== password) {
        return onError && onError("Incorrect password.");
      }

      const blockedStatus = getProfileStatus(blocked);

      setCurrentUser(blocked);

      sendToPendingReview({
        email: cleanEmail,
        name: blocked.full_name || "",
        found: 1,
        status: blockedStatus,
        replace: true,
      });

      setAuthModal(null);
    } else {
      setAuthModal(null);

      router.replace(
        `/pending-review?email=${encodeURIComponent(cleanEmail)}&found=0`
      );
    }
  };

  const handleLogout = async () => {
    try {
      if (SUPA) {
        await Auth.signOut();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setCurrentUser(null);
      setMyUpvotes(new Set());
      setMyReports(new Set());
      setNotifications([]);
      setMyPosts([]);
      setAuthModal(null);
      setMobileMenu(false);

      window.location.replace("/");
    }
  };

  const requireAuth = () => {
    if (!currentUser) {
      setAuthModal("login");
      return false;
    }

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") {
      const userEmail = currentUser.email || currentUser.personal_email || "";

      sendToPendingReview({
        email: userEmail,
        name: currentUser.full_name || "",
        found: 1,
        status: userStatus,
        replace: true,
      });

      return false;
    }

    return true;
  };

  // ═════════════════════════════════════════════════════════════════════
  // POSTS
  // ═════════════════════════════════════════════════════════════════════

  const createPost = async ({ id, title, body, category, anonymous }) => {
  if (!requireAuth()) {
    return { ok: false, error: "You must be verified to post." };
  }

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
  pushToast("Posted to feed", "success");

  return { ok: true };
};

  const upvotePost = async (postId) => {
    if (!requireAuth()) return;

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
    if (!requireAuth()) return;
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
      const userStatus = getProfileStatus(currentUser);
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
    if (!requireAuth()) {
      return { ok: false, error: "You must be verified to comment." };
    }

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
      arr.map((p) => (p.id === postId ? { ...p, ...updates, edited: true } : p))
    );

    pushToast("Post updated", "success");

    return { ok: true };
  };

  const deleteMyPost = async (postId) => {
    if (!requireAuth()) return;

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
      reloadBlockedUsers();

      return;
    }

    const pendingUser = pendingUsers.find((x) => x.id === profileId);
    const blockedUser = blockedUsers.find((x) => x.id === profileId);
    const u = pendingUser || blockedUser;

    if (!u) return;

    const verifiedUser = {
      ...u,
      status: "verified",
      verification_status: "verified",
    };

    setUsers((list) => [...list, verifiedUser]);
    setPendingUsers((list) => list.filter((x) => x.id !== profileId));
    setBlockedUsers((list) => list.filter((x) => x.id !== profileId));

    pushToast(`Verified ${u.full_name}`, "success");
  };

  const verifyUserByEmail = async (email) => {
    const cleanEmail = email?.trim().toLowerCase() || "";

    if (!cleanEmail) {
      pushToast("Enter an email address first.", "error");
      return { ok: false, error: "Email is required." };
    }

    if (SUPA) {
      const { data, error } = await ProfilesDB.adminVerifyProfileByEmail(
        cleanEmail
      );

      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      if (!data) {
        pushToast("No profile found with that email.", "error");
        return { ok: false, error: "No profile found with that email." };
      }

      pushToast(`Verified ${data.full_name || cleanEmail}`, "success");

      reloadPendingUsers();
      reloadVerifiedUsers();
      reloadBlockedUsers();

      return { ok: true, data };
    }

    const pendingMatch = pendingUsers.find(
      (u) => u.email === cleanEmail || u.personal_email === cleanEmail
    );

    const blockedMatch = blockedUsers.find(
      (u) => u.email === cleanEmail || u.personal_email === cleanEmail
    );

    const existingUser = users.find(
      (u) => u.email === cleanEmail || u.personal_email === cleanEmail
    );

    const target = pendingMatch || blockedMatch || existingUser;

    if (!target) {
      pushToast("No profile found with that email.", "error");
      return { ok: false, error: "No profile found with that email." };
    }

    const verifiedUser = {
      ...target,
      status: "verified",
      verification_status: "verified",
    };

    setPendingUsers((list) =>
      list.filter(
        (u) => u.email !== cleanEmail && u.personal_email !== cleanEmail
      )
    );

    setBlockedUsers((list) =>
      list.filter(
        (u) => u.email !== cleanEmail && u.personal_email !== cleanEmail
      )
    );

    setUsers((list) => {
      const exists = list.some(
        (u) => u.email === cleanEmail || u.personal_email === cleanEmail
      );

      if (exists) {
        return list.map((u) =>
          u.email === cleanEmail || u.personal_email === cleanEmail
            ? verifiedUser
            : u
        );
      }

      return [...list, verifiedUser];
    });

    pushToast(`Verified ${verifiedUser.full_name || cleanEmail}`, "success");

    return { ok: true, data: verifiedUser };
  };

  const revokeUserByEmail = async (email) => {
    const cleanEmail = email?.trim().toLowerCase() || "";

    if (!cleanEmail) {
      pushToast("Enter an email address first.", "error");
      return { ok: false, error: "Email is required." };
    }

    if (SUPA) {
      const { data, error } = await ProfilesDB.adminRevokeProfileByEmail(
        cleanEmail
      );

      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      if (!data) {
        pushToast("No non-admin profile found with that email.", "error");
        return {
          ok: false,
          error: "No non-admin profile found with that email.",
        };
      }

      pushToast(`Revoked access for ${data.full_name || cleanEmail}`, "info");

      reloadPendingUsers();
      reloadVerifiedUsers();
      reloadBlockedUsers();

      return { ok: true, data };
    }

    const wasPending = pendingUsers.find(
      (u) => u.email === cleanEmail || u.personal_email === cleanEmail
    );

    const wasVerified = users.find(
      (u) => u.email === cleanEmail || u.personal_email === cleanEmail
    );

    const wasBlocked = blockedUsers.find(
      (u) => u.email === cleanEmail || u.personal_email === cleanEmail
    );

    const target = wasPending || wasVerified || wasBlocked;

    if (!target || target.role === "admin") {
      pushToast("No non-admin profile found with that email.", "error");
      return { ok: false, error: "No non-admin profile found with that email." };
    }

    const revokedUser = {
      ...target,
      status: "revoked",
      verification_status: "revoked",
    };

    setPendingUsers((list) =>
      list.filter(
        (u) => u.email !== cleanEmail && u.personal_email !== cleanEmail
      )
    );

    setUsers((list) =>
      list.filter(
        (u) => u.email !== cleanEmail && u.personal_email !== cleanEmail
      )
    );

    setBlockedUsers((list) => {
      const exists = list.some((u) => u.id === revokedUser.id);

      if (exists) {
        return list.map((u) => (u.id === revokedUser.id ? revokedUser : u));
      }

      return [revokedUser, ...list];
    });

    pushToast(`Revoked access for ${revokedUser.full_name || cleanEmail}`, "info");

    return { ok: true, data: revokedUser };
  };

  const rejectUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminRejectProfile(profileId);

      if (error) return pushToast(error.message, "error");

      pushToast(
        "Profile rejected. User can request re-review or contact admin.",
        "info"
      );

      reloadPendingUsers();
      reloadBlockedUsers();

      return;
    }

    const pendingUser = pendingUsers.find((u) => u.id === profileId);

    if (!pendingUser) return;

    const rejectedUser = {
      ...pendingUser,
      status: "rejected",
      verification_status: "rejected",
    };

    setPendingUsers((list) => list.filter((u) => u.id !== profileId));
    setBlockedUsers((list) => [rejectedUser, ...list]);

    pushToast("Profile rejected", "info");
  };

  const removeUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminRemoveProfile(profileId);

      if (error) return pushToast(error.message, "error");

      pushToast(
        "Member access revoked. Their old posts and comments remain visible.",
        "info"
      );

      reloadVerifiedUsers();
      reloadBlockedUsers();

      return;
    }

    const userToRevoke = users.find((u) => u.id === profileId);

    if (!userToRevoke) return;

    const revokedUser = {
      ...userToRevoke,
      status: "revoked",
      verification_status: "revoked",
    };

    setUsers((list) => list.filter((u) => u.id !== profileId));
    setBlockedUsers((list) => [revokedUser, ...list]);

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
  // PROFILE / RE-REVIEW
  // ═════════════════════════════════════════════════════════════════════

  const updateProfile = async (updates) => {
    if (!requireAuth()) return;

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

  const requestRereview = async ({ militaryEmail, phone } = {}) => {
    const cleanMilitaryEmail = militaryEmail?.trim().toLowerCase() || "";
    const cleanPhone = phone?.trim() || "";

    if (!currentUser) {
      setAuthModal("login");
      return { ok: false, error: "You must be signed in to request re-review." };
    }

    if (SUPA) {
      const { error } = await ProfilesDB.requestProfileRereview({
        militaryEmail: cleanMilitaryEmail,
        phone: cleanPhone,
      });

      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      const { profile } = await Auth.getCurrentUser();

      const updatedProfile = profile || {
        ...currentUser,
        status: "pending",
        verification_status: "pending",
        military_email: cleanMilitaryEmail || currentUser.military_email,
        phone: cleanPhone || currentUser.phone,
      };

      setCurrentUser(updatedProfile);

      pushToast(
        "Re-review request submitted. Your profile is pending admin review again.",
        "success"
      );

      sendToPendingReview({
        email: updatedProfile.email || updatedProfile.personal_email || "",
        name: updatedProfile.full_name || "",
        found: 1,
        status: "pending",
        replace: true,
      });

      return { ok: true, data: updatedProfile };
    }

    const updatedUser = {
      ...currentUser,
      status: "pending",
      verification_status: "pending",
      military_email: cleanMilitaryEmail || currentUser.military_email,
      phone: cleanPhone || currentUser.phone,
    };

    setCurrentUser(updatedUser);

    setUsers((list) =>
      list.filter(
        (u) =>
          u.id !== currentUser.id &&
          u.email !== currentUser.email &&
          u.personal_email !== currentUser.personal_email
      )
    );

    setBlockedUsers((list) =>
      list.filter(
        (u) =>
          u.id !== currentUser.id &&
          u.email !== currentUser.email &&
          u.personal_email !== currentUser.personal_email
      )
    );

    setPendingUsers((list) => {
      const exists = list.some((u) => u.id === currentUser.id);

      if (exists) {
        return list.map((u) => (u.id === currentUser.id ? updatedUser : u));
      }

      return [...list, updatedUser];
    });

    pushToast("Re-review request submitted", "success");

    sendToPendingReview({
      email: updatedUser.email || updatedUser.personal_email || "",
      name: updatedUser.full_name || "",
      found: 1,
      status: "pending",
      replace: true,
    });

    return { ok: true, data: updatedUser };
  };

  // ═════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═════════════════════════════════════════════════════════════════════

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") return [];

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

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") return;

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

    const userStatus = getProfileStatus(currentUser);

    if (userStatus !== "verified") return [];

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
    blockedUsers,
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
    verifyUserByEmail,
    revokeUserByEmail,
    rejectUser,
    removeUser,
    adminDeletePost,
    restoreReportedPost,

    // Profile / Re-review
    updateProfile,
    requestRereview,

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