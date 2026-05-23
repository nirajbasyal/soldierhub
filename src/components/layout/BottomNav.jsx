"use client";

import { Home, Plus, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";

const POST_ACTION_COLOR = "#B31942";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const app = useApp() || {};
  const {
    currentUser,
    setAuthModal = () => {},
  } = app;

  const safeUser = currentUser || null;
  const displayName = safeUser?.full_name || safeUser?.email || "SoldierHub user";
  const displayEmail = safeUser?.email || safeUser?.personal_email || "";
  const userStatus = safeUser?.status || safeUser?.verification_status || "pending";

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

  const goCompose = () => {
    if (!safeUser) {
      return setAuthModal("login");
    }

    if (userStatus !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
    }

    router.push("/compose");
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
      k: "compose",
      label: "Post",
      icon: Plus,
      active: pathname === "/compose",
      onClick: goCompose,
      ariaLabel: "Create a post",
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
        backgroundColor: "rgba(253,254,255,0.98)",
        borderColor: T.border,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -10px 26px rgba(11,28,44,0.075)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="grid grid-cols-3 min-h-[64px]">
        {tabs.map((t) => {
          const Icon = t.icon;

          if (t.k === "compose") {
            return (
              <button
                key={t.k}
                type="button"
                onClick={t.onClick}
                className="sh-tap relative flex flex-col items-center justify-center px-1 pb-1 pt-0 gap-0.5 min-w-0"
                aria-label={t.ariaLabel || t.label}
              >
                <div
                  className="sh-post-fab -mt-6 mb-1 flex h-14 w-14 items-center justify-center rounded-full border-[4px] shadow-lg"
                  style={{
                    backgroundColor: POST_ACTION_COLOR,
                    borderColor: T.card,
                    boxShadow: "0 12px 24px rgba(179,25,66,0.24)",
                  }}
                >
                  <Icon size={25} strokeWidth={2.7} style={{ color: "#FFFFFF" }} />
                </div>

                <span
                  className="text-[10px] font-bold leading-none"
                  style={{ color: t.active ? POST_ACTION_COLOR : T.textMuted }}
                >
                  {t.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={t.k}
              type="button"
              onClick={t.onClick}
              className="sh-tap flex flex-col items-center justify-center py-2.5 px-1 gap-1 relative min-w-0"
              aria-label={t.ariaLabel || t.label}
            >
              <div
                className="flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-150"
                style={{ backgroundColor: t.active ? "rgba(179,25,66,0.08)" : "transparent" }}
              >
                <Icon
                  size={21}
                  strokeWidth={t.active ? 2.6 : 2}
                  style={{ color: t.active ? POST_ACTION_COLOR : T.textMuted }}
                />
              </div>

              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: t.active ? POST_ACTION_COLOR : T.textMuted }}
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
