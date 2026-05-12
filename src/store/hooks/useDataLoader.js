import { useCallback, useEffect, useRef } from "react";
import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";
import * as PostsDB from "@/lib/db/posts";
import * as NotificationsDB from "@/lib/db/notifications";
import {
  subscribeToMyNotifications,
  subscribeToPosts,
} from "@/lib/db/realtime";
import { getProfileStatus, sanitizePosts } from "../utils/appHelpers";

const FEED_REALTIME_DEBOUNCE_MS = 1200;
const NOTIFICATION_REALTIME_DEBOUNCE_MS = 800;
const FEED_PAGE_SIZE = 30;

function getNextCursor(posts = []) {
  const lastPost = posts[posts.length - 1];

  if (!lastPost?.created_at || !lastPost?.id) {
    return null;
  }

  return {
    createdAt: lastPost.created_at,
    id: lastPost.id,
  };
}

function mergeUniquePosts(existingPosts = [], nextPosts = []) {
  const seen = new Set();

  return [...existingPosts, ...nextPosts].filter((post) => {
    const id = post?.id || post?.post_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function useDataLoader({
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
  sendToPendingReview,
}) {
  const feedReloadTimerRef = useRef(null);
  const feedReloadInFlightRef = useRef(false);
  const feedReloadQueuedRef = useRef(false);
  const notificationReloadTimerRef = useRef(null);
  const notificationReloadInFlightRef = useRef(false);
  const notificationReloadQueuedRef = useRef(false);

  const reloadPosts = useCallback(async () => {
    if (!SUPA) return;
    setPostsLoading(true);

    try {
      const { data } = await PostsDB.listPosts({ limit: FEED_PAGE_SIZE });
      const cleanPosts = sanitizePosts(data || []);
      setPosts(cleanPosts);
      setPostsCursor(getNextCursor(cleanPosts));
      setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
    } finally {
      setPostsLoading(false);
    }
  }, [SUPA, setHasMorePosts, setPosts, setPostsCursor, setPostsLoading]);

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
        const mergedPosts = mergeUniquePosts(currentPosts, cleanPosts);
        setPostsCursor(getNextCursor(mergedPosts));
        return mergedPosts;
      });

      setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
      return { ok: true };
    } finally {
      setLoadingMorePosts(false);
    }
  }, [SUPA, setHasMorePosts, setLoadingMorePosts, setPosts, setPostsCursor]);

  const reloadPostsQuietly = useCallback(async () => {
    if (!SUPA) return;

    if (feedReloadInFlightRef.current) {
      feedReloadQueuedRef.current = true;
      return;
    }

    feedReloadInFlightRef.current = true;

    try {
      const { data } = await PostsDB.listPosts({ limit: FEED_PAGE_SIZE });
      const cleanPosts = sanitizePosts(data || []);
      setPosts(cleanPosts);
      setPostsCursor(getNextCursor(cleanPosts));
      setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
    } finally {
      feedReloadInFlightRef.current = false;

      if (feedReloadQueuedRef.current) {
        feedReloadQueuedRef.current = false;
        feedReloadTimerRef.current = window.setTimeout(
          () => reloadPostsQuietly(),
          FEED_REALTIME_DEBOUNCE_MS
        );
      }
    }
  }, [SUPA, setHasMorePosts, setPosts, setPostsCursor]);

  const scheduleRealtimeFeedReload = useCallback(() => {
    if (!SUPA || typeof window === "undefined") return;

    if (feedReloadTimerRef.current) {
      window.clearTimeout(feedReloadTimerRef.current);
    }

    feedReloadTimerRef.current = window.setTimeout(
      () => reloadPostsQuietly(),
      FEED_REALTIME_DEBOUNCE_MS
    );
  }, [SUPA, reloadPostsQuietly]);

  const reloadNotificationsQuietly = useCallback(
    async (userId) => {
      if (!SUPA || !userId) return;

      if (notificationReloadInFlightRef.current) {
        notificationReloadQueuedRef.current = true;
        return;
      }

      notificationReloadInFlightRef.current = true;

      try {
        const { data } = await NotificationsDB.listMyNotifications(userId);
        setNotifications(data || []);
      } finally {
        notificationReloadInFlightRef.current = false;

        if (notificationReloadQueuedRef.current) {
          notificationReloadQueuedRef.current = false;
          notificationReloadTimerRef.current = window.setTimeout(
            () => reloadNotificationsQuietly(userId),
            NOTIFICATION_REALTIME_DEBOUNCE_MS
          );
        }
      }
    },
    [SUPA, setNotifications]
  );

  const scheduleNotificationReload = useCallback(
    (userId) => {
      if (!SUPA || !userId || typeof window === "undefined") return;

      if (notificationReloadTimerRef.current) {
        window.clearTimeout(notificationReloadTimerRef.current);
      }

      notificationReloadTimerRef.current = window.setTimeout(
        () => reloadNotificationsQuietly(userId),
        NOTIFICATION_REALTIME_DEBOUNCE_MS
      );
    },
    [SUPA, reloadNotificationsQuietly]
  );

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

    (async () => {
      const { profile } = await Auth.getCurrentUser();
      if (cancelled) return;

      const status = getProfileStatus(profile);

      if (status === "rejected" || status === "revoked") {
        setCurrentUser(profile || null);
        setAuthLoading(false);
        sendToPendingReview({
          email: profile?.email || profile?.personal_email || "",
          name: profile?.full_name || "",
          found: 1,
          status,
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
      const status = getProfileStatus(profile);

      if (status === "rejected" || status === "revoked") {
        setCurrentUser(profile || null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);
        sendToPendingReview({
          email: profile?.email || user.email || "",
          name: profile?.full_name || "",
          found: 1,
          status,
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
  }, [
    SUPA,
    sendToPendingReview,
    setAuthLoading,
    setCurrentUser,
    setMyReports,
    setMyUpvotes,
    setNotifications,
  ]);

  useEffect(() => {
    if (SUPA) reloadPosts();
  }, [SUPA, reloadPosts]);

  useEffect(() => {
    if (!SUPA) return;
    const unsubscribe = subscribeToPosts(() => scheduleRealtimeFeedReload());

    return () => {
      unsubscribe();

      if (feedReloadTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(feedReloadTimerRef.current);
      }
    };
  }, [SUPA, scheduleRealtimeFeedReload]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;

    const status = getProfileStatus(currentUser);

    if (status !== "verified") {
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
      setMyPosts(sanitizePosts(mine || [], currentUser.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [
    SUPA,
    currentUser,
    setMyPosts,
    setMyReports,
    setMyUpvotes,
    setNotifications,
  ]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;
    if (getProfileStatus(currentUser) !== "verified") return;

    const unsubscribe = subscribeToMyNotifications(currentUser.id, () => {
      scheduleNotificationReload(currentUser.id);
    });

    return () => {
      unsubscribe();

      if (notificationReloadTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(notificationReloadTimerRef.current);
      }
    };
  }, [SUPA, currentUser, scheduleNotificationReload]);

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
    reloadMyPosts,
    reloadPendingUsers,
    reloadVerifiedUsers,
    reloadBlockedUsers,
  };
}
