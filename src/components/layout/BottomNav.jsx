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
        backgroundColor: T.card,
        borderColor: T.border,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -12px 30px rgba(11,28,44,0.08)",
      }}
    >
      <div className="grid grid-cols-3 min-h-[66px]">
        {tabs.map((t) => {
          const Icon = t.icon;

          if (t.k === "compose") {
            return (
              <button
                key={t.k}
                type="button"
                onClick={t.onClick}
                className="relative flex flex-col items-center justify-center px-1 pb-1 pt-0 gap-0.5 min-w-0"
                aria-label={t.ariaLabel || t.label}
              >
                <div
                  className="-mt-7 mb-1 flex h-16 w-16 items-center justify-center rounded-full border-[5px] shadow-lg transition-transform active:scale-95"
                  style={{
                    backgroundColor: POST_ACTION_COLOR,
                    borderColor: T.card,
                    boxShadow: "0 14px 28px rgba(179,25,66,0.28)",
                  }}
                >
                  <Icon size={28} strokeWidth={2.7} style={{ color: "#FFFFFF" }} />
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
              className="flex flex-col items-center justify-center py-2.5 px-1 gap-1 relative min-w-0"
              aria-label={t.ariaLabel || t.label}
            >
              <Icon
                size={21}
                strokeWidth={t.active ? 2.6 : 2}
                style={{ color: t.active ? T.gold : T.textMuted }}
              />

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
