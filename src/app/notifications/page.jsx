"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import NotificationItem from "@/components/notifications/NotificationItem";

const NOTIFICATION_CACHE_PREFIX = "soldierhub_notifications_cache_";
const NOTIFICATION_LAST_CACHE_KEY = "soldierhub_notifications_cache_last";

function getNotificationCacheKey(userId) {
  return `${NOTIFICATION_CACHE_PREFIX}${userId || "guest"}`;
}

function readNotificationCacheByKey(key) {
  if (typeof window === "undefined" || !key) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.notifications) ? parsed.notifications : [];
  } catch {
    return [];
  }
}

function readCachedNotifications(userId) {
  if (!userId) return readNotificationCacheByKey(NOTIFICATION_LAST_CACHE_KEY);
  return readNotificationCacheByKey(getNotificationCacheKey(userId));
}

function saveCachedNotifications(userId, notifications) {
  if (typeof window === "undefined" || !Array.isArray(notifications)) return;

  const payload = JSON.stringify({
    savedAt: Date.now(),
    notifications: notifications.slice(0, 30),
  });

  try {
    window.localStorage.setItem(NOTIFICATION_LAST_CACHE_KEY, payload);

    if (userId) {
      window.localStorage.setItem(getNotificationCacheKey(userId), payload);
    }
  } catch {
    // Browser storage can fail in private mode or when full. Notifications still load normally.
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    currentUser,
    authLoading,
    notifications = [],
    setAuthModal,
    markNotificationsRead,
  } = useApp();

  const [cachedNotifications, setCachedNotifications] = useState(() => readCachedNotifications(null));

  useEffect(() => {
    if (!currentUser?.id) return;
    setCachedNotifications(readCachedNotifications(currentUser.id));
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || notifications.length === 0) return;

    const freshNotifications = notifications.slice(0, 30);
    setCachedNotifications(freshNotifications);
    saveCachedNotifications(currentUser.id, freshNotifications);
  }, [currentUser?.id, notifications]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.replace("/");
      setAuthModal("login");
      return;
    }

    markNotificationsRead();
  }, [authLoading, currentUser, router, setAuthModal, markNotificationsRead]);

  const displayNotifications = useMemo(() => {
    return notifications.length > 0 ? notifications : cachedNotifications;
  }, [cachedNotifications, notifications]);

  if (authLoading && displayNotifications.length === 0) {
    return <NotificationsLoadingState />;
  }

  if (!authLoading && !currentUser) {
    return <NotificationsLoadingState />;
  }

  return (
    <AppShell hideNav>
      <main className="min-h-screen bg-[#F3F6FA] pb-24 md:pb-12">
        <div className="mx-auto w-full max-w-2xl px-4 py-5 md:px-6 md:py-10">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/")}>
            Back to feed
          </Button>

          <section className="mt-5 mb-5 rounded-[30px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3F8]">
                <Bell size={22} style={{ color: T.gold }} />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  Activity
                </div>
                <h1 className="text-3xl leading-tight font-serif md:text-4xl" style={{ color: T.navy }}>
                  Notifications
                </h1>
                <p className="mt-1 text-sm" style={{ color: T.muted }}>
                  Replies and activity from your SoldierHub posts.
                </p>
              </div>
            </div>
          </section>

          {displayNotifications.length === 0 ? (
            <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-sm backdrop-blur">
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                body="When someone replies to your posts, you'll see it here."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          )}

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}

function NotificationsLoadingState() {
  return (
    <AppShell hideNav>
      <main className="min-h-screen bg-[#F3F6FA] px-4 pb-28 pt-5 md:pb-12 md:pt-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-5 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-[#E8EEF5]" />
              <div className="min-w-0 flex-1">
                <div className="h-5 w-40 animate-pulse rounded-full bg-[#DDE6EF]" />
                <div className="mt-2 h-3 w-56 max-w-full animate-pulse rounded-full bg-[#E8EEF5]" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="rounded-[26px] border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur"
              >
                <div className="flex gap-3">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-[#E8EEF5]" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#DDE6EF]" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-[#E8EEF5]" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-[#E8EEF5]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
