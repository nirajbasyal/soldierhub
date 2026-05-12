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
  sendToPendingReview,
}) {
  const feedReloadTimerRef = useRef(null);
  const feedReloadInFlightRef = useRef(false);
  const feedReloadQueuedRef = useRef(false);

  const reloadPosts = useCallback(async () => {
    if (!SUPA) return;
    setPostsLoading(true);

    try {
      const { data } = await PostsDB.listPosts();
      setPosts(sanitizePosts(data || []));
    } finally {
      setPostsLoading(false);
    }
  }, [SUPA, setPosts, setPostsLoading]);

  const reloadPostsQuietly = useCallback(async () => {
    if (!SUPA) return;

    if (feedReloadInFlightRef.current) {
      feedReloadQueuedRef.current = true;
      return;
    }

    feedReloadInFlightRef.current = true;

    try {
      const { data } = await PostsDB.listPosts();
      setPosts(sanitizePosts(data || []));
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
  }, [SUPA, setPosts]);

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

    const unsubscribe = subscribeToMyNotifications(currentUser.id, async () => {
      const { data } = await NotificationsDB.listMyNotifications(currentUser.id);
      setNotifications(data || []);
    });

    return () => unsubscribe();
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
    reloadMyPosts,
    reloadPendingUsers,
    reloadVerifiedUsers,
    reloadBlockedUsers,
  };
}
