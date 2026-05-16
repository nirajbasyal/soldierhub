"use client";

import { Bell, Home, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const app = useApp() || {};
  const {
    currentUser,
    unreadCount = 0,
    setAuthModal = () => {},
  } = app;

  const safeUser = currentUser || null;
  const displayName = safeUser?.full_name || safeUser?.email || "SoldierHub user";
  const displayEmail = safeUser?.email || safeUser?.personal_email || "";
  const userStatus = safeUser?.status || safeUser?.verification_status || "pending";
  const notificationCount = Math.max(0, Number(unreadCount) || 0);
  const showNotificationBadge =
    Boolean(safeUser) && userStatus === "verified" && notificationCount > 0;
  const notificationBadgeText =
    notificationCount > 99 ? "99+" : String(notificationCount);

  const goProfile = () => {
    if (!safeUser) {
      return setAuthModal("login");
    }

    if (userStatus !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
    }

    router.push("/profile");
  };

  const goNotifications = () => {
    if (!safeUser) {
      return setAuthModal("login");
    }

    if (userStatus !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
    }

    router.push("/notifications");
  };

  const tabs = [
    {
      k: "feed",
      label: "Feed",
      icon: Home,
      active: pathname === "/",
      onClick: () => router.push("/"),
    },
    {
      k: "notifications",
      label: "Notifications",
      icon: Bell,
      active: pathname === "/notifications",
      onClick: goNotifications,
      badge: showNotificationBadge ? notificationBadgeText : "",
      ariaLabel: showNotificationBadge
        ? `Notifications, ${notificationCount} unread`
        : "Notifications",
    },
    {
      k: "profile",
      label: "Profile",
      icon: User,
      active: pathname.startsWith("/profile") || pathname.startsWith("/pending-review"),
      onClick: goProfile,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 border-t"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="grid grid-cols-3">
        {tabs.map((t) => {
          const Icon = t.icon;

          return (
            <button
              key={t.k}
              type="button"
              onClick={t.onClick}
              className="flex flex-col items-center justify-center py-2.5 px-1 gap-1 relative min-w-0"
              aria-label={t.ariaLabel || t.label}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={t.active ? 2.5 : 2}
                  style={{ color: t.active ? T.gold : T.textMuted }}
                />

                {t.badge && (
                  <span
                    className="absolute -right-2.5 -top-2.5 min-w-[18px] h-[18px] px-1 rounded-full border flex items-center justify-center text-[9px] font-bold leading-none shadow-sm"
                    style={{
                      backgroundColor: "#B31942",
                      borderColor: T.card,
                      color: "#FFFFFF",
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </div>

              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: t.active ? T.gold : T.textMuted }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
