import { useCallback, useEffect, useMemo } from "react";
import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";
import * as PostsDB from "@/lib/db/posts";
import * as NotificationsDB from "@/lib/db/notifications";
import { subscribeToMyNotifications } from "@/lib/db/realtime";
import { getPostId, getProfileStatus, sanitizePosts } from "../utils/appHelpers";

const FEED_PAGE_SIZE = 30;
const NOTIFICATION_PAGE_SIZE = 30;
const FEED_CACHE_KEY = "soldierhub_feed_cache_v4";
const FEED_CACHE_MAX_AGE_MS = 1000 * 60 * 5;
const PROFILE_CACHE_KEY = "soldierhub_current_profile_v1";
const PROFILE_CACHE_MAX_AGE_MS = 1000 * 60 * 30;
const NOTIFICATION_CACHE_KEY_PREFIX = "soldierhub_notifications_cache_v1_";
const NOTIFICATION_CACHE_MAX_AGE_MS = 1000 * 60 * 3;

function getNextCursor(items = []) {
  const lastItem = items[items.length - 1];

  if (!lastItem?.created_at || !lastItem?.id) {
    return null;
  }

  return {
    createdAt: lastItem.created_at,
    id: lastItem.id,
  };
}

function mergeUniqueItems(existingItems = [], nextItems = []) {
  const seen = new Set();

  return [...existingItems, ...nextItems].filter((item) => {
    const id = item?.id || item?.post_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function getUniquePostIds(posts = []) {
  return [...new Set((posts || []).map(getPostId).filter(Boolean))];
}

function mergeViewerPostIds(currentSet = new Set(), visiblePostIds = [], matchedPostIds = []) {
  const visibleIds = new Set(visiblePostIds || []);
  const matchedIds = new Set(matchedPostIds || []);
  const next = new Set(currentSet);

  visibleIds.forEach((postId) => {
    if (matchedIds.has(postId)) {
      next.add(postId);
    } else {
      next.delete(postId);
    }
  });

  return next;
}

function readFeedCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const savedAt = Number(parsed?.savedAt || 0);

    if (!posts.length || !savedAt || Date.now() - savedAt > FEED_CACHE_MAX_AGE_MS) {
      return null;
    }

    return posts;
  } catch {
    window.localStorage.removeItem(FEED_CACHE_KEY);
    return null;
  }
}

function writeFeedCache(posts = []) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({ posts: posts.slice(0, FEED_PAGE_SIZE), savedAt: Date.now() })
    );
  } catch {
    // Local cache is only a speed boost. Ignore storage errors safely.
  }
}

function isSafeCachedProfile(profile) {
  return Boolean(profile?.id && getProfileStatus(profile) === "verified");
}

function readProfileCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const profile = parsed?.profile || null;
    const savedAt = Number(parsed?.savedAt || 0);

    if (
      !savedAt ||
      Date.now() - savedAt > PROFILE_CACHE_MAX_AGE_MS ||
      !isSafeCachedProfile(profile)
    ) {
      window.localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    return profile;
  } catch {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  }
}

function writeProfileCache(profile) {
  if (typeof window === "undefined") return;

  try {
    if (!isSafeCachedProfile(profile)) {
      window.localStorage.removeItem(PROFILE_CACHE_KEY);
      return;
    }

    window.localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ profile, savedAt: Date.now() })
    );
  } catch {
    // Profile cache is only used for faster first paint.
  }
}

function clearProfileCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_CACHE_KEY);
}

function getNotificationCacheKey(userId) {
  return `${NOTIFICATION_CACHE_KEY_PREFIX}${userId}`;
}

function isSafeCachedNotification(notification) {
  return Boolean(notification?.id && notification?.created_at);
}

function readNotificationCache(userId) {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(getNotificationCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const notifications = Array.isArray(parsed?.notifications) ? parsed.notifications : [];
    const savedAt = Number(parsed?.savedAt || 0);

    if (
      !notifications.length ||
      !savedAt ||
      Date.now() - savedAt > NOTIFICATION_CACHE_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(getNotificationCacheKey(userId));
      return null;
    }

    return notifications.filter(isSafeCachedNotification).slice(0, NOTIFICATION_PAGE_SIZE);
  } catch {
    window.localStorage.removeItem(getNotificationCacheKey(userId));
    return null;
  }
}

function writeNotificationCache(userId, notifications = []) {
  if (typeof window === "undefined" || !userId) return;

  try {
    const safeNotifications = (notifications || [])
      .filter(isSafeCachedNotification)
      .slice(0, NOTIFICATION_PAGE_SIZE);

    if (!safeNotifications.length) {
      window.localStorage.removeItem(getNotificationCacheKey(userId));
      return;
    }

    window.localStorage.setItem(
      getNotificationCacheKey(userId),
      JSON.stringify({ notifications: safeNotifications, savedAt: Date.now() })
    );
  } catch {
    // Notification cache is only used for faster first paint.
  }
}

function clearNotificationCache(userId = null) {
  if (typeof window === "undefined") return;

  if (userId) {
    window.localStorage.removeItem(getNotificationCacheKey(userId));
    return;
  }

  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith(NOTIFICATION_CACHE_KEY_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  });
}

function prependRealtimeNotification(currentNotifications = [], notification) {
  if (!notification?.id) return currentNotifications;

  const alreadyExists = currentNotifications.some((item) => item.id === notification.id);
  if (alreadyExists) return currentNotifications;

  return [notification, ...currentNotifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function useDataLoader({
  SUPA,
  currentUser,
  posts,
  setCurrentUser,
  setAuthLoading,
  setPostsLoading,
  setNotificationsLoading,
  setPosts,
  setMyPosts,
  setMyUpvotes,
  setMyReports,
  setNotifications,
  setUnreadCount,
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
}) {
  const visibleFeedPostIds = useMemo(() => getUniquePostIds(posts), [posts]);
  const visibleFeedPostIdsKey = useMemo(
    () => visibleFeedPostIds.join(","),
    [visibleFeedPostIds]
  );

  const refreshUnreadCount = useCallback(
    async (userId, { skipCache = true } = {}) => {
      if (!SUPA || !userId) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await NotificationsDB.getUnreadCount(userId, {
        skipCache,
      });

      if (!error) {
        setUnreadCount(Math.max(0, Number(count) || 0));
      }
    },
    [SUPA, setUnreadCount]
  );

  const refreshViewerStateForPosts = useCallback(
    async (postIds = []) => {
      if (!SUPA || !currentUser?.id) return;
      if (getProfileStatus(currentUser) !== "verified") return;

      const safePostIds = [...new Set((postIds || []).filter(Boolean))];
      if (safePostIds.length === 0) return;

      const { data, error } = await PostsDB.listMyFeedViewerState(
        currentUser.id,
        safePostIds
      );

      if (error) return;

      setMyUpvotes((currentSet) =>
        mergeViewerPostIds(currentSet, safePostIds, data?.upvotedPostIds || [])
      );
      setMyReports((currentSet) =>
        mergeViewerPostIds(currentSet, safePostIds, data?.reportedPostIds || [])
      );
    },
    [SUPA, currentUser, setMyReports, setMyUpvotes]
  );

  const reloadPosts = useCallback(
    async ({ silent = false } = {}) => {
      if (!SUPA) return;

      if (!silent) {
        const cachedPosts = readFeedCache();
        if (cachedPosts) {
          const cleanCachedPosts = sanitizePosts(cachedPosts || []);
          setPosts(cleanCachedPosts);
          setPostsCursor(getNextCursor(cleanCachedPosts));
          setHasMorePosts(cleanCachedPosts.length === FEED_PAGE_SIZE);
          setHasNewFeedItems(false);
          setPostsLoading(false);
        } else {
          setPostsLoading(true);
        }
      }

      try {
        const { data } = await PostsDB.listPosts({ limit: FEED_PAGE_SIZE });
        const cleanPosts = sanitizePosts(data || []);
        setPosts(cleanPosts);
        setPostsCursor(getNextCursor(cleanPosts));
        setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
        setHasNewFeedItems(false);
        writeFeedCache(cleanPosts);
        refreshViewerStateForPosts(getUniquePostIds(cleanPosts));
      } finally {
        if (!silent) setPostsLoading(false);
      }
    },
    [
      SUPA,
      refreshViewerStateForPosts,
      setHasMorePosts,
      setHasNewFeedItems,
      setPosts,
      setPostsCursor,
      setPostsLoading,
    ]
  );

  const loadMorePosts = useCallback(async () => {
    if (!SUPA) return { ok: false };

    let cursorForRequest = null;

    setPosts((currentPosts) => {
      cursorForRequest = getNextCursor(currentPosts);
      return currentPosts;
    });

    if (!cursorForRequest) {
      setHasMorePosts(false);
      return { ok: false };
    }

    setLoadingMorePosts(true);

    try {
      const { data, error } = await PostsDB.listPosts({
        limit: FEED_PAGE_SIZE,
        cursorCreatedAt: cursorForRequest.createdAt,
        cursorId: cursorForRequest.id,
      });

      if (error) return { ok: false, error: error.message };

      const cleanPosts = sanitizePosts(data || []);

      setPosts((currentPosts) => {
        const mergedPosts = mergeUniqueItems(currentPosts, cleanPosts);
        setPostsCursor(getNextCursor(mergedPosts));
        writeFeedCache(mergedPosts);
        return mergedPosts;
      });

      refreshViewerStateForPosts(getUniquePostIds(cleanPosts));
      setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
      return { ok: true };
    } finally {
      setLoadingMorePosts(false);
    }
  }, [SUPA, refreshViewerStateForPosts, setHasMorePosts, setLoadingMorePosts, setPosts, setPostsCursor]);

  const loadMoreNotifications = useCallback(async () => {
    if (!SUPA || !currentUser?.id) return { ok: false };

    let cursorForRequest = null;

    setNotifications((currentNotifications) => {
      cursorForRequest = getNextCursor(currentNotifications);
      return currentNotifications;
    });

    if (!cursorForRequest) {
      setHasMoreNotifications(false);
      return { ok: false };
    }

    setLoadingMoreNotifications(true);

    try {
      const { data, error } = await NotificationsDB.listMyNotifications(currentUser.id, {
        limit: NOTIFICATION_PAGE_SIZE,
        cursorCreatedAt: cursorForRequest.createdAt,
        cursorId: cursorForRequest.id,
      });

      if (error) return { ok: false, error: error.message };

      const nextNotifications = data || [];

      setNotifications((currentNotifications) => {
        const mergedNotifications = mergeUniqueItems(
          currentNotifications,
          nextNotifications
        );
        setNotificationsCursor(getNextCursor(mergedNotifications));
        writeNotificationCache(currentUser.id, mergedNotifications);
        return mergedNotifications;
      });

      setHasMoreNotifications(nextNotifications.length === NOTIFICATION_PAGE_SIZE);
      return { ok: true };
    } finally {
      setLoadingMoreNotifications(false);
    }
  }, [
    SUPA,
    currentUser?.id,
    setHasMoreNotifications,
    setLoadingMoreNotifications,
    setNotifications,
    setNotificationsCursor,
  ]);

  const reloadMyPosts = useCallback(async () => {
    if (!SUPA || !currentUser) return;
    if (getProfileStatus(currentUser) !== "verified") return;
    const { data } = await PostsDB.listMyPosts(currentUser.id);
    setMyPosts(sanitizePosts(data || [], currentUser.id));
  }, [SUPA, currentUser, setMyPosts]);

  const reloadPendingUsers = useCallback(async () => {
    if (!SUPA) return;
    const { data } = await ProfilesDB.listPendingProfiles();
    setPendingUsers(data || []);
  }, [SUPA, setPendingUsers]);

  const reloadVerifiedUsers = useCallback(async () => {
    if (!SUPA) return;
    const { data } = await ProfilesDB.listVerifiedProfiles();
    setUsers(data || []);
  }, [SUPA, setUsers]);

  const reloadBlockedUsers = useCallback(async () => {
    if (!SUPA) return;
    const { data } = await ProfilesDB.listBlockedProfiles();
    setBlockedUsers(data || []);
  }, [SUPA, setBlockedUsers]);

  useEffect(() => {
    if (!SUPA) return;

    let cancelled = false;
    let unsubscribe;

    const cachedProfile = readProfileCache();
    if (cachedProfile) {
      setCurrentUser(cachedProfile);
      setAuthLoading(false);
      refreshUnreadCount(cachedProfile.id, { skipCache: true });
    }

    (async () => {
      const { profile } = await Auth.getCurrentUser();
      if (cancelled) return;

      const status = getProfileStatus(profile);

      if (status === "rejected" || status === "revoked") {
        clearProfileCache();
        clearNotificationCache(profile?.id);
        setCurrentUser(profile || null);
        setUnreadCount(0);
        setAuthLoading(false);
        setNotificationsLoading(false);
        sendToPendingReview({
          email: profile?.email || profile?.personal_email || "",
          name: profile?.full_name || "",
          found: 1,
          status,
          replace: true,
        });
        return;
      }

      if (profile) {
        writeProfileCache(profile);
      } else {
        clearProfileCache();
      }

      setCurrentUser(profile || null);
      setAuthLoading(false);

      if (profile && status === "verified") {
        refreshUnreadCount(profile.id, { skipCache: true });
      } else {
        setUnreadCount(0);
        setNotificationsLoading(false);
      }
    })();

    unsubscribe = Auth.onAuthChange(async (user) => {
      if (!user) {
        clearProfileCache();
        clearNotificationCache();
        setCurrentUser(null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);
        setUnreadCount(0);
        setNotificationsCursor(null);
        setHasMoreNotifications(false);
        setNotificationsLoading(false);
        return;
      }

      setNotificationsLoading(true);
      const { data: profile } = await ProfilesDB.getProfile(user.id);
      const status = getProfileStatus(profile);

      if (status === "rejected" || status === "revoked") {
        clearProfileCache();
        clearNotificationCache(user.id);
        setCurrentUser(profile || null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);
        setUnreadCount(0);
        setNotificationsCursor(null);
        setHasMoreNotifications(false);
        setNotificationsLoading(false);
        sendToPendingReview({
          email: profile?.email || user.email || "",
          name: profile?.full_name || "",
          found: 1,
          status,
          replace: true,
        });
        return;
      }

      if (profile) {
        writeProfileCache(profile);
      } else {
        clearProfileCache();
      }

      setCurrentUser(profile || null);

      if (profile && status === "verified") {
        refreshUnreadCount(profile.id, { skipCache: true });
      } else {
        setUnreadCount(0);
        setNotificationsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [
    SUPA,
    refreshUnreadCount,
    sendToPendingReview,
    setAuthLoading,
    setCurrentUser,
    setHasMoreNotifications,
    setMyReports,
    setMyUpvotes,
    setNotifications,
    setNotificationsCursor,
    setNotificationsLoading,
    setUnreadCount,
  ]);

  useEffect(() => {
    if (SUPA) reloadPosts();
  }, [SUPA, reloadPosts]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;

    const status = getProfileStatus(currentUser);

    if (status !== "verified") {
      clearNotificationCache(currentUser?.id);
      setMyUpvotes(new Set());
      setMyReports(new Set());
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsCursor(null);
      setHasMoreNotifications(false);
      setNotificationsLoading(false);
      setMyPosts([]);
      return;
    }

    let cancelled = false;
    const cachedNotifications = readNotificationCache(currentUser.id);

    if (cachedNotifications) {
      setNotifications(cachedNotifications);
      setNotificationsCursor(getNextCursor(cachedNotifications));
      setHasMoreNotifications(cachedNotifications.length === NOTIFICATION_PAGE_SIZE);
      setNotificationsLoading(false);
    } else {
      setNotificationsLoading(true);
    }

    refreshUnreadCount(currentUser.id, { skipCache: true });

    (async () => {
      const { data: notifs, error } = await NotificationsDB.listMyNotifications(currentUser.id, {
        limit: NOTIFICATION_PAGE_SIZE,
      });

      if (cancelled) return;

      if (!error) {
        const safeNotifications = notifs || [];
        setNotifications(safeNotifications);
        setNotificationsCursor(getNextCursor(safeNotifications));
        setHasMoreNotifications(safeNotifications.length === NOTIFICATION_PAGE_SIZE);
        writeNotificationCache(currentUser.id, safeNotifications);
      } else if (!cachedNotifications) {
        setNotifications([]);
        setNotificationsCursor(null);
        setHasMoreNotifications(false);
      }

      setNotificationsLoading(false);
      refreshUnreadCount(currentUser.id, { skipCache: true });
    })();

    (async () => {
      const { data: mine } = await PostsDB.listMyPosts(currentUser.id);

      if (cancelled) return;

      setMyPosts(sanitizePosts(mine || [], currentUser.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [
    SUPA,
    currentUser,
    refreshUnreadCount,
    setHasMoreNotifications,
    setMyPosts,
    setMyReports,
    setMyUpvotes,
    setNotifications,
    setNotificationsCursor,
    setNotificationsLoading,
    setUnreadCount,
  ]);

  useEffect(() => {
    if (!SUPA || !currentUser?.id) return;
    if (getProfileStatus(currentUser) !== "verified") return;
    if (!visibleFeedPostIdsKey) return;

    refreshViewerStateForPosts(visibleFeedPostIds);
  }, [
    SUPA,
    currentUser,
    refreshViewerStateForPosts,
    visibleFeedPostIds,
    visibleFeedPostIdsKey,
  ]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;
    if (getProfileStatus(currentUser) !== "verified") return;

    const unsubscribe = subscribeToMyNotifications(currentUser.id, (notification) => {
      if (notification && notification.read === false) {
        setUnreadCount((currentCount) => Math.max(0, Number(currentCount) || 0) + 1);
      } else {
        refreshUnreadCount(currentUser.id, { skipCache: true });
      }

      NotificationsDB.hydrateNotificationRows([notification]).then((hydrated) => {
        const safeNotification = hydrated?.[0] || notification;
        setNotifications((currentNotifications) => {
          const mergedNotifications = prependRealtimeNotification(
            currentNotifications,
            safeNotification
          );
          writeNotificationCache(currentUser.id, mergedNotifications);
          return mergedNotifications;
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [SUPA, currentUser, refreshUnreadCount, setNotifications, setUnreadCount]);

  useEffect(() => {
    if (SUPA && currentUser?.role === "admin") {
      reloadPendingUsers();
      reloadVerifiedUsers();
      reloadBlockedUsers();
    }
  }, [SUPA, currentUser, reloadPendingUsers, reloadVerifiedUsers, reloadBlockedUsers]);

  return {
    reloadPosts,
    loadMorePosts,
    loadMoreNotifications,
    reloadMyPosts,
    reloadPendingUsers,
    reloadVerifiedUsers,
    reloadBlockedUsers,
  };
}
