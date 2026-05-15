"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
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
  if (isFollowNotification(notification)) {
    return `follow:${getActorKey(notification)}`;
  }

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
      notifications: group.notifications.sort(
        (a, b) => getNotificationTime(b) - getNotificationTime(a)
      ),
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
    hasMoreNotifications,
    loadingMoreNotifications,
    loadMoreNotifications,
    setAuthModal,
    markNotificationsRead,
  } = useApp();

  const unreadSnapshotRef = useRef(new Set());
  const didMarkReadRef = useRef(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    didMarkReadRef.current = false;
    unreadSnapshotRef.current = new Set();
  }, [currentUser?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.replace("/");
      setAuthModal("login");
    }
  }, [authLoading, currentUser, router, setAuthModal]);

  useEffect(() => {
    if (authLoading || notificationsLoading || !currentUser || didMarkReadRef.current) return;
    if (notifications.length === 0) return;

    unreadSnapshotRef.current = new Set(
      notifications.filter((item) => item.read === false).map((item) => item.id)
    );
    didMarkReadRef.current = true;
    markNotificationsRead();
  }, [authLoading, currentUser, markNotificationsRead, notifications, notificationsLoading]);

  const groupedNotifications = useMemo(() => {
    return groupNotificationsByActivity(notifications, unreadSnapshotRef.current);
  }, [notifications]);

  const unreadGroupCount = groupedNotifications.filter((group) =>
    group.notifications.some((item) => item.read === false)
  ).length;

  if (authLoading || notificationsLoading) {
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

          <section className="mt-5 mb-5 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3F8]">
                <Bell size={22} style={{ color: T.gold }} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  Activity
                </div>
                <h1 className="text-3xl leading-tight font-serif md:text-4xl" style={{ color: T.navy }}>
                  Notifications
                </h1>
                <p className="mt-1 text-sm" style={{ color: T.muted }}>
                  {unreadGroupCount > 0
                    ? `${unreadGroupCount} new notification${unreadGroupCount > 1 ? "s" : ""}.`
                    : "Replies, upvotes, and new followers from the SoldierHub community."}
                </p>
              </div>
            </div>
          </section>

          {groupedNotifications.length === 0 ? (
            <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-sm backdrop-blur">
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                body="When someone replies to your posts, upvotes them, or follows your profile, you'll see it here."
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {groupedNotifications.map((group) => (
                  <NotificationItem key={group.id} group={group} />
                ))}
              </div>

              {hasMoreNotifications ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMoreNotifications}
                    disabled={loadingMoreNotifications}
                    className="rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: T.card,
                      borderColor: T.border,
                      color: T.ink,
                    }}
                  >
                    {loadingMoreNotifications
                      ? "Loading..."
                      : "Load more notifications"}
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
                  Activity
                </div>
                <h1 className="text-3xl leading-tight font-serif md:text-4xl" style={{ color: T.navy }}>
                  Notifications
                </h1>
                <p className="mt-1 text-sm font-medium" style={{ color: T.muted }}>
                  Loading notifications...
                </p>
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
