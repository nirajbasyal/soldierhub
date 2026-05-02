"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import NotificationItem from "@/components/notifications/NotificationItem";

export default function NotificationsPage() {
  const router = useRouter();
  const { currentUser, authLoading, notifications, setAuthModal, markNotificationsRead } = useApp();

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace("/");
      setAuthModal("login");
      return;
    }
    // Mark all as read on visit
    markNotificationsRead();
  }, [authLoading, currentUser, router, setAuthModal, markNotificationsRead]);

  if (authLoading) return null;
  if (!currentUser) return null;

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-24 md:pb-12" style={{ backgroundColor: T.bg }}>
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/")}>
            Back to feed
          </Button>

          <div className="mt-6 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={16} style={{ color: T.gold }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: T.gold }}>
                Activity
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl leading-tight font-serif" style={{ color: T.navy }}>
              Notifications
            </h1>
          </div>

          {notifications.length === 0 ? (
            <div
              className="rounded-2xl border p-8"
              style={{ backgroundColor: T.card, borderColor: T.border }}
            >
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                body="When someone replies to your posts, you'll see it here."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => <NotificationItem key={n.id} notification={n} />)}
            </div>
          )}

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
