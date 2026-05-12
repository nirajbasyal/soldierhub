"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { CATEGORIES } from "@/lib/constants";
import { SEED_PENDING, SEED_POSTS, SEED_USERS } from "@/lib/seed";
import { isSupabaseConfigured } from "@/lib/supabase/client";

import { useAdminActions } from "./hooks/useAdminActions";
import { useAuthActions } from "./hooks/useAuthActions";
import { useDataLoader } from "./hooks/useDataLoader";
import { useNotificationActions } from "./hooks/useNotificationActions";
import { usePostActions } from "./hooks/usePostActions";
import { useProfileActions } from "./hooks/useProfileActions";
import { useToasts } from "./hooks/useToasts";
import {
  getProfileStatus,
  isIdentifiedPost,
  normalizeSeedPosts,
} from "./utils/appHelpers";

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
};

const SUPA = isSupabaseConfigured();

function buildSeedComments(seedPosts) {
  const comments = {};

  seedPosts.forEach((post) => {
    if (!isIdentifiedPost(post)) return;

    comments[post.id] = (post.comments || []).map((comment) => ({
      ...comment,
      post_id: post.id,
    }));
  });

  return comments;
}

function filterPosts({ posts, category, search }) {
  const q = search.trim().toLowerCase();

  return posts.filter((post) => {
    if (!isIdentifiedPost(post)) return false;
    if (post.status === "deleted" || post.status === "removed") return false;
    if (category !== "All" && post.category !== category) return false;
    if (!q) return true;

    return [post.title, post.body, post.category, post.author_name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(q));
  });
}

function countPostsByCategory(posts) {
  const validPosts = posts.filter((post) => isIdentifiedPost(post));
  const counts = { All: validPosts.length };

  CATEGORIES.forEach((category) => {
    if (category.key === "All") return;
    counts[category.key] = validPosts.filter((post) => post.category === category.key)
      .length;
  });

  return counts;
}

export function AppProvider({ children }) {
  const router = useRouter();

  // Data state
  const [users, setUsers] = useState(SUPA ? [] : SEED_USERS);
  const [pendingUsers, setPendingUsers] = useState(
    SUPA ? [] : SEED_PENDING
  );
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [posts, setPosts] = useState(
    SUPA ? [] : normalizeSeedPosts(SEED_POSTS)
  );
  const [myPosts, setMyPosts] = useState([]);
  const [postComments, setPostComments] = useState(
    SUPA ? {} : buildSeedComments(SEED_POSTS)
  );
  const [myUpvotes, setMyUpvotes] = useState(new Set());
  const [myReports, setMyReports] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  // Session state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(SUPA);
  const [postsLoading, setPostsLoading] = useState(SUPA);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(SUPA);
  const [postsCursor, setPostsCursor] = useState(null);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [notificationsCursor, setNotificationsCursor] = useState(null);

  // UI state
  const [authModal, setAuthModal] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [hasNewFeedItems, setHasNewFeedItems] = useState(false);

  const { toasts, pushToast, dismissToast } = useToasts();

  const sendToPendingReview = useCallback(
    ({
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
    },
    [router]
  );

  const {
    reloadPosts,
    loadMorePosts,
    loadMoreNotifications,
    reloadMyPosts,
    reloadPendingUsers,
    reloadVerifiedUsers,
    reloadBlockedUsers,
  } = useDataLoader({
    SUPA,
    currentUser,
    setCurrentUser,
    setAuthLoading,
    setPostsLoading,
    setPosts,
    setMyPosts,
    setMyUpvotes,
    setMyReports,
    setNotifications,
    setPendingUsers,
    setUsers,
    setBlockedUsers,
    setPostsCursor,
    setHasMorePosts,
    setLoadingMorePosts,
    setNotificationsCursor,
    setHasMoreNotifications,
    setLoadingMoreNotifications,
    setHasNewFeedItems,
    sendToPendingReview,
  });

  const { handleSignup, handleLogin, handleLogout, requireAuth } =
    useAuthActions({
      SUPA,
      router,
      currentUser,
      users,
      pendingUsers,
      blockedUsers,
      setCurrentUser,
      setUsers,
      setPendingUsers,
      setMyPosts,
      setMyUpvotes,
      setMyReports,
      setNotifications,
      setAuthModal,
      setMobileMenu,
      pushToast,
      sendToPendingReview,
    });

  const postActions = usePostActions({
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
  });

  const adminActions = useAdminActions({
    SUPA,
    users,
    pendingUsers,
    blockedUsers,
    setUsers,
    setPendingUsers,
    setBlockedUsers,
    setPosts,
    pushToast,
    reloadPosts,
    reloadPendingUsers,
    reloadVerifiedUsers,
    reloadBlockedUsers,
  });

  const profileActions = useProfileActions({
    SUPA,
    currentUser,
    setCurrentUser,
    setUsers,
    setPendingUsers,
    setBlockedUsers,
    requireAuth,
    pushToast,
    sendToPendingReview,
  });

  const notificationActions = useNotificationActions({
    SUPA,
    currentUser,
    notifications,
    setNotifications,
  });

  const userStatus = getProfileStatus(currentUser);
  const isVerified = Boolean(currentUser && userStatus === "verified");
  const isAdmin = Boolean(isVerified && currentUser?.role === "admin");

  const visiblePosts = useMemo(
    () => posts.filter((post) => isIdentifiedPost(post)),
    [posts]
  );

  const filteredPosts = useMemo(
    () => filterPosts({ posts: visiblePosts, category, search }),
    [visiblePosts, category, search]
  );

  const categoryCounts = useMemo(() => countPostsByCategory(visiblePosts), [visiblePosts]);

  const reportedPosts = useMemo(
    () =>
      visiblePosts.filter(
        (post) => post.status === "reported" || (post.report_count || 0) > 0
      ),
    [visiblePosts]
  );

  const value = useMemo(
    () => ({
      // Environment
      SUPA,
      supabaseEnabled: SUPA,
      isLiveMode: SUPA,

      // Data
      users,
      pendingUsers,
      blockedUsers,
      posts: visiblePosts,
      filteredPosts,
      reportedPosts,
      myPosts,
      postComments,
      myUpvotes,
      myReports,
      notifications,
      categoryCounts,
      counts: categoryCounts,
      postsCursor,
      hasMorePosts,
      notificationsCursor,
      hasMoreNotifications,

      // Session
      currentUser,
      userStatus,
      isVerified,
      isAdmin,
      authLoading,
      postsLoading,
      loadingMorePosts,
      loadingMoreNotifications,

      // UI
      authModal,
      setAuthModal,
      mobileMenu,
      setMobileMenu,
      search,
      setSearch,
      category,
      setCategory,
      hasNewFeedItems,
      setHasNewFeedItems,
      toasts,
      pushToast,
      dismissToast,

      // Loaders
      reloadPosts,
      loadMorePosts,
      loadMoreNotifications,
      reloadMyPosts,
      reloadPendingUsers,
      reloadVerifiedUsers,
      reloadBlockedUsers,

      // Auth actions
      handleSignup,
      handleLogin,
      handleLogout,
      requireAuth,

      // Post actions
      ...postActions,

      // Admin actions
      ...adminActions,

      // Profile actions
      ...profileActions,

      // Notification actions
      ...notificationActions,

      // Shared helpers
      getProfileStatus,
    }),
    [
      users,
      pendingUsers,
      blockedUsers,
      visiblePosts,
      filteredPosts,
      reportedPosts,
      myPosts,
      postComments,
      myUpvotes,
      myReports,
      notifications,
      categoryCounts,
      postsCursor,
      hasMorePosts,
      notificationsCursor,
      hasMoreNotifications,
      currentUser,
      userStatus,
      isVerified,
      isAdmin,
      authLoading,
      postsLoading,
      loadingMorePosts,
      loadingMoreNotifications,
      authModal,
      mobileMenu,
      search,
      category,
      hasNewFeedItems,
      toasts,
      pushToast,
      dismissToast,
      reloadPosts,
      loadMorePosts,
      loadMoreNotifications,
      reloadMyPosts,
      reloadPendingUsers,
      reloadVerifiedUsers,
      reloadBlockedUsers,
      handleSignup,
      handleLogin,
      handleLogout,
      requireAuth,
      postActions,
      adminActions,
      profileActions,
      notificationActions,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
