"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as NotificationsDB from "@/lib/db/notifications";
import { subscribeToMyNotifications } from "@/lib/db/realtime";

const UNREAD_COUNT_CACHE_PREFIX = "soldierhub_unread_count_cache_";
const UNREAD_COUNT_LAST_CACHE_KEY = "soldierhub_unread_count_cache_last";

function getCacheKey(userId) {
  return `${UNREAD_COUNT_CACHE_PREFIX}${userId || "guest"}`;
}

function readUnreadCache(userId) {
  if (typeof window === "undefined") return 0;

  try {
    const key = userId ? getCacheKey(userId) : UNREAD_COUNT_LAST_CACHE_KEY;
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;

    const parsed = JSON.parse(raw);
    const count = Number(parsed?.count || 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

function saveUnreadCache(userId, count) {
  if (typeof window === "undefined") return;

  const safeCount = Math.max(0, Number(count || 0));
  const payload = JSON.stringify({ savedAt: Date.now(), count: safeCount });

  try {
    window.localStorage.setItem(UNREAD_COUNT_LAST_CACHE_KEY, payload);
    if (userId) window.localStorage.setItem(getCacheKey(userId), payload);
  } catch {
    // Browser storage can fail in private mode or when full. Badge still works normally.
  }
}

function getProfileStatus(user) {
  return user?.status || user?.verification_status || "pending";
}

export default function useUnreadNotificationCount(currentUser) {
  const pathname = usePathname();
  const [count, setCount] = useState(() => readUnreadCache(null));

  const userId = currentUser?.id || null;
  const userStatus = getProfileStatus(currentUser);
  const isVerified = Boolean(userId && userStatus === "verified");
  const isNotificationsPage = pathname?.startsWith("/notifications");

  const refreshUnreadCount = useCallback(async () => {
    if (!isVerified || !userId) return;

    if (isNotificationsPage) {
      setCount(0);
      saveUnreadCache(userId, 0);
      return;
    }

    const { count: freshCount } = await NotificationsDB.getUnreadCount(userId);
    const safeCount = freshCount || 0;

    setCount(safeCount);
    saveUnreadCache(userId, safeCount);
  }, [isVerified, isNotificationsPage, userId]);

  useEffect(() => {
    if (!isVerified) {
      setCount(0);
      return;
    }

    setCount(readUnreadCache(userId));
  }, [isVerified, userId]);

  useEffect(() => {
    let cancelled = false;

    if (!isVerified) return undefined;

    if (isNotificationsPage) {
      setCount(0);
      saveUnreadCache(userId, 0);
      return undefined;
    }

    (async () => {
      const { count: freshCount } = await NotificationsDB.getUnreadCount(userId);
      if (cancelled) return;

      const safeCount = freshCount || 0;
      setCount(safeCount);
      saveUnreadCache(userId, safeCount);
    })();

    return () => {
      cancelled = true;
    };
  }, [isVerified, isNotificationsPage, userId]);

  useEffect(() => {
    if (!isVerified) return undefined;

    const unsubscribe = subscribeToMyNotifications(userId, async () => {
      await refreshUnreadCount();
    });

    return () => unsubscribe();
  }, [isVerified, refreshUnreadCount, userId]);

  return isNotificationsPage ? 0 : count;
}
