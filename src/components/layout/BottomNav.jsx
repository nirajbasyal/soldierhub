"use client";

import { Bell, Home, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import useUnreadNotificationCount from "@/hooks/useUnreadNotificationCount";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    currentUser,
    setAuthModal,
    setMobileMenu,
  } = useApp();

  const unreadCount = useUnreadNotificationCount(currentUser);

  const goNotifications = () => {
    if (!currentUser) {
      return setAuthModal("login");
    }

    const userStatus =
      currentUser?.status || currentUser?.verification_status || "pending";

    if (userStatus !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(
          currentUser?.email || ""
        )}&name=${encodeURIComponent(
          currentUser?.full_name || "SoldierHub user"
        )}&found=1`
      );
    }

    router.push("/notifications");
  };

  const menuActive =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/pending-review") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms");

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
      count: unreadCount,
    },
    {
      k: "menu",
      label: "Menu",
      icon: Menu,
      active: menuActive,
      onClick: () => setMobileMenu(true),
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
          const safeCount = Number(t.count || 0);

          return (
            <button
              key={t.k}
              type="button"
              onClick={t.onClick}
              className="flex flex-col items-center justify-center py-2.5 px-1 gap-1 relative min-w-0"
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={t.active ? 2.5 : 2}
                  style={{ color: t.active ? T.gold : T.textMuted }}
                />

                {safeCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-extrabold flex items-center justify-center px-1 shadow-sm ring-2 ring-white"
                    style={{
                      backgroundColor: "#B31942",
                      color: "#FFFFFF",
                      lineHeight: 1,
                    }}
                    aria-label={`${safeCount} unread notifications`}
                  >
                    {safeCount > 9 ? "9+" : safeCount}
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
