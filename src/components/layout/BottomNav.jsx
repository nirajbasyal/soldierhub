"use client";

import { Bell, Home, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const app = useApp() || {};
  const {
    currentUser,
    setAuthModal = () => {},
    setMobileMenu = () => {},
  } = app;

  const safeUser = currentUser || null;
  const displayName = safeUser?.full_name || safeUser?.email || "SoldierHub user";
  const displayEmail = safeUser?.email || safeUser?.personal_email || "";
  const userStatus = safeUser?.status || safeUser?.verification_status || "pending";

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
