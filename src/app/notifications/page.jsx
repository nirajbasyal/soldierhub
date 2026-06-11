"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import EmptyState from "@/components/ui/EmptyState";
import CircularBackButton from "@/components/ui/CircularBackButton";
import NotificationItem from "@/components/notifications/NotificationItem";

function getNotificationTime(notification) {
  const time = new Date(notification?.created_at || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isFollowNotification(notification) {
  return String(notification?.type || "").toLowerCase() === "follow";
}

function getActorKey(notification) {
  return (
    notification?.actor_user_id ||
    notification?.actor_id ||
    notification?.user_id ||
    notification?.profile_id ||
    notification?.created_by ||
    notification?.id ||
    "unknown"
  );
}

function getNotificationGroupKey(notification) {
  if (isFollowNotification(notification)) return `follow:${getActorKey(notification)}`;
  if (notification?.post_id) return `post:${notification.post_id}`;
  return `notification:${notification?.id || Math.random().toString(36).slice(2)}`;
}

function groupNotificationsByActivity(notifications = [], unreadSnapshotIds = new Set()) {
  const groups = new Map();
  notifications.forEach((notification) => {
    const key = getNotificationGroupKey(notification);
    if (!key) return;
    const wasUnread = unreadSnapshotIds.has(notification.id) || notification.read === false;
    const safeNotification = wasUnread ? { ...notification, read: false } : notification;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        id: key,
        postId: notification.post_id || null,
        post: notification.post || null,
        latestAt: notification.created_at,
        notifications: [safeNotification],
      });
      return;
    }
    existing.notifications.push(safeNotification);
    if (!existing.post && notification.post) existing.post = notification.post;
    if (getNotificationTime(notification) > getNotificationTime({ created_at: existing.latestAt })) {
      existing.latestAt = notification.created_at;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      notifications: group.notifications.sort((a, b) => getNotificationTime(b) - getNotificationTime(a)),
    }))
    .sort((a, b) => getNotificationTime({ created_at: b.latestAt }) - getNotificationTime({ created_at: a.latestAt }));
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    currentUser,
    authLoading,
    notificationsLoading,
    notifications = [],
    markAllNotificationsRead,
    reloadNotifications,
    loadMoreNotifications,
    hasMoreNotifications,
    loadingMoreNotifications,
    unreadNotificationCount,
  } = useApp();
  const [readSnapshotIds, setReadSnapshotIds] = useState(() => new Set());
  const hasMarkedInitialRead = useRef(false);
  const lastNotificationSignature = useRef("");

  const groupedNotifications = useMemo(
    () => groupNotificationsByActivity(notifications, readSnapshotIds),
    [notifications, readSnapshotIds]
  );

  const notificationSignature = useMemo(
    () => notifications.map((notification) => notification.id).filter(Boolean).join("|"),
    [notifications]
  );

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace("/");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser) return;
    reloadNotifications?.({ reset: true });
  }, [currentUser, reloadNotifications]);

  useEffect(() => {
    if (!currentUser || notificationsLoading || !notifications.length) return;
    if (hasMarkedInitialRead.current && lastNotificationSignature.current === notificationSignature) return;

    const unreadIds = notifications
      .filter((notification) => notification.read === false)
      .map((notification) => notification.id)
      .filter(Boolean);

    if (!unreadIds.length) {
      lastNotificationSignature.current = notificationSignature;
      hasMarkedInitialRead.current = true;
      return;
    }

    setReadSnapshotIds(new Set(unreadIds));
    lastNotificationSignature.current = notificationSignature;
    hasMarkedInitialRead.current = true;
    markAllNotificationsRead?.({ silent: true });
  }, [currentUser, markAllNotificationsRead, notificationSignature, notifications, notificationsLoading]);

  if (authLoading || notificationsLoading) return <NotificationsLoadingState />;
  if (!currentUser) return null;

  return (
    <AppShell hideNav>
      <main className="min-h-screen bg-[#F3F6FA] px-4 pb-28 pt-5 md:pb-12 md:pt-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <section className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start gap-3">
              <CircularBackButton fallbackHref="/" />
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3F8]">
                  <Bell size={22} style={{ color: T.gold }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                    Notifications
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight" style={{ color: T.ink }}>
                    Activity center
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: T.muted }}>
                    Catch up on replies, upvotes, follows, and updates from your community.
                  </p>
                </div>
              </div>
              {unreadNotificationCount > 0 && (
                <span className="rounded-full bg-[#C89B3C] px-3 py-1 text-xs font-black text-white shadow-sm">
                  {unreadNotificationCount} new
                </span>
              )}
            </div>
          </section>

          {groupedNotifications.length === 0 ? (
            <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-sm backdrop-blur">
              <EmptyState
                icon={Bell}
                title="You&apos;re all caught up"
                body="When someone replies to your posts, upvotes them, or follows your profile, you&apos;ll see it here."
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {groupedNotifications.map((group) => <NotificationItem key={group.id} group={group} />)}
              </div>

              {hasMoreNotifications ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMoreNotifications}
                    disabled={loadingMoreNotifications}
                    className="rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: T.card, borderColor: T.border, color: T.ink }}
                  >
                    {loadingMoreNotifications ? "Loading..." : "Load more notifications"}
                  </button>
                </div>
              ) : null}
            </>
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3F8]">
                <Bell size={22} style={{ color: T.gold }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  Notifications
                </div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: T.ink }}>
                  Loading activity
                </h1>
                <p className="mt-1 text-sm font-medium" style={{ color: T.muted }}>
                  Loading notifications...
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-[26px] border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
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
