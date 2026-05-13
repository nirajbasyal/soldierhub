import { useCallback, useEffect } from "react";
import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";
import * as PostsDB from "@/lib/db/posts";
import * as NotificationsDB from "@/lib/db/notifications";
import { subscribeToMyNotifications } from "@/lib/db/realtime";
import { getProfileStatus, sanitizePosts } from "../utils/appHelpers";

const FEED_PAGE_SIZE = 30;
const NOTIFICATION_PAGE_SIZE = 30;

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
  setCurrentUser,
  setAuthLoading,
  setPostsLoading,
  setNotificationsLoading,
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
}) {
  const reloadPosts = useCallback(async () => {
    if (!SUPA) return;
    setPostsLoading(true);

    try {
      const { data } = await PostsDB.listPosts({ limit: FEED_PAGE_SIZE });
      const cleanPosts = sanitizePosts(data || []);
      setPosts(cleanPosts);
      setPostsCursor(getNextCursor(cleanPosts));
      setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
      setHasNewFeedItems(false);
    } finally {
      setPostsLoading(false);
    }
  }, [
    SUPA,
    setHasMorePosts,
    setHasNewFeedItems,
    setPosts,
    setPostsCursor,
    setPostsLoading,
  ]);

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
        return mergedPosts;
      });

      setHasMorePosts(cleanPosts.length === FEED_PAGE_SIZE);
      return { ok: true };
    } finally {
      setLoadingMorePosts(false);
    }
  }, [SUPA, setHasMorePosts, setLoadingMorePosts, setPosts, setPostsCursor]);

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

    (async () => {
      const { profile } = await Auth.getCurrentUser();
      if (cancelled) return;

      const status = getProfileStatus(profile);

      if (status === "rejected" || status === "revoked") {
        setCurrentUser(profile || null);
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

      setCurrentUser(profile || null);
      setAuthLoading(false);
      if (!profile || status !== "verified") setNotificationsLoading(false);
    })();

    unsubscribe = Auth.onAuthChange(async (user) => {
      if (!user) {
        setCurrentUser(null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);
        setNotificationsCursor(null);
        setHasMoreNotifications(false);
        setNotificationsLoading(false);
        return;
      }

      setNotificationsLoading(true);
      const { data: profile } = await ProfilesDB.getProfile(user.id);
      const status = getProfileStatus(profile);

      if (status === "rejected" || status === "revoked") {
        setCurrentUser(profile || null);
        setMyUpvotes(new Set());
        setMyReports(new Set());
        setNotifications([]);
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

      setCurrentUser(profile || null);
      if (!profile || status !== "verified") setNotificationsLoading(false);
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
    setHasMoreNotifications,
    setMyReports,
    setMyUpvotes,
    setNotifications,
    setNotificationsCursor,
    setNotificationsLoading,
  ]);

  useEffect(() => {
    if (SUPA) reloadPosts();
  }, [SUPA, reloadPosts]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;

    const status = getProfileStatus(currentUser);

    if (status !== "verified") {
      setMyUpvotes(new Set());
      setMyReports(new Set());
      setNotifications([]);
      setNotificationsCursor(null);
      setHasMoreNotifications(false);
      setNotificationsLoading(false);
      setMyPosts([]);
      return;
    }

    let cancelled = false;
    setNotificationsLoading(true);

    (async () => {
      const [{ data: ups }, { data: reps }, { data: notifs }, { data: mine }] =
        await Promise.all([
          PostsDB.listMyUpvotedPostIds(currentUser.id),
          PostsDB.listMyReportedPostIds(currentUser.id),
          NotificationsDB.listMyNotifications(currentUser.id, {
            limit: NOTIFICATION_PAGE_SIZE,
          }),
          PostsDB.listMyPosts(currentUser.id),
        ]);

      if (cancelled) return;

      const safeNotifications = notifs || [];

      setMyUpvotes(new Set(ups));
      setMyReports(new Set(reps));
      setNotifications(safeNotifications);
      setNotificationsCursor(getNextCursor(safeNotifications));
      setHasMoreNotifications(safeNotifications.length === NOTIFICATION_PAGE_SIZE);
      setNotificationsLoading(false);
      setMyPosts(sanitizePosts(mine || [], currentUser.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [
    SUPA,
    currentUser,
    setHasMoreNotifications,
    setMyPosts,
    setMyReports,
    setMyUpvotes,
    setNotifications,
    setNotificationsCursor,
    setNotificationsLoading,
  ]);

  useEffect(() => {
    if (!SUPA || !currentUser) return;
    if (getProfileStatus(currentUser) !== "verified") return;

    const unsubscribe = subscribeToMyNotifications(currentUser.id, (notification) => {
      setNotifications((currentNotifications) =>
        prependRealtimeNotification(currentNotifications, notification)
      );
    });

    return () => {
      unsubscribe();
    };
  }, [SUPA, currentUser, setNotifications]);

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
