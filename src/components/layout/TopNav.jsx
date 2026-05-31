"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BookMarked,
  Menu,
  Search,
  Shield,
  UserPlus,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const SEARCH_ACTIVE_COLOR = "#B31942";
const SEARCH_IDLE_COLOR = "#8A5570";
const LOGO_SRC = "/brand/soldierhub-logo-header.svg";

function getUserAvatarUrl(user) {
  return (
    user?.avatar_url ||
    user?.profile_avatar_url ||
    user?.author_avatar_url ||
    user?.author_avatar_url_cached ||
    null
  );
}

export default function TopNav() {
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);

  const app = useApp() || {};
  const {
    currentUser,
    isAdmin = false,
    unreadCount = 0,
    search = "",
    setSearch = () => {},
    setAuthModal = () => {},
    setMobileMenu = () => {},
    mobileMenu = false,
  } = app;

  const safeUser = currentUser || null;
  const displayName = safeUser?.full_name || safeUser?.email || "SoldierHub user";
  const displayEmail = safeUser?.email || safeUser?.personal_email || "";
  const firstName = displayName.split(" ")[0] || "Profile";
  const userAvatarUrl = getUserAvatarUrl(safeUser);
  const userStatus = safeUser?.status || safeUser?.verification_status || "pending";
  const notificationCount = Math.max(0, Number(unreadCount) || 0);
  const showNotificationBadge =
    Boolean(safeUser) && userStatus === "verified" && notificationCount > 0;
  const notificationBadgeText = notificationCount > 99 ? "99+" : String(notificationCount);
  const hasSearchText = String(search || "").trim().length > 0;
  const searchIconColor = hasSearchText ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR;
  const rightSearchButtonActive = hasSearchText || searchFocused;
  const rightSearchButtonColor = rightSearchButtonActive ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR;

  const goProfile = () => {
    if (!safeUser) return setAuthModal("login");

    if (userStatus !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
    }

    router.push("/profile");
  };

  const goNotifications = () => {
    if (!safeUser) return setAuthModal("login");

    if (userStatus !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
    }

    router.push("/notifications");
  };

  const goSearchPage = ({ includeQuery = true } = {}) => {
    const q = includeQuery ? String(search || "").trim() : "";
    const searchUrl = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    router.push(searchUrl);
  };

  const handleSearchSubmit = (event) => {
    event?.preventDefault?.();
    goSearchPage({ includeQuery: true });
  };

  const iconButtonStyle = ({ active = false, alert = false } = {}) => ({
    borderColor: active || alert ? "rgba(179,25,66,0.32)" : "rgba(207,218,232,0.88)",
    backgroundColor: active || alert ? "rgba(253,236,240,0.92)" : "rgba(255,255,255,0.88)",
    color: active || alert ? SEARCH_ACTIVE_COLOR : T.navy,
    boxShadow: active || alert ? "0 8px 18px rgba(179,25,66,0.08)" : "0 8px 18px rgba(7,27,51,0.045)",
  });

  const searchForm = () => (
    <form onSubmit={handleSearchSubmit} className="hidden min-w-0 flex-1 md:flex">
      <div className="relative w-full">
        <Search
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: searchIconColor }}
        />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
          placeholder="Search posts or members"
          aria-label="Search posts or members"
          type="search"
          autoComplete="off"
          inputMode="search"
          enterKeyHint="search"
          className="h-11 w-full rounded-full border pl-11 pr-16 text-sm font-medium outline-none shadow-sm transition-all"
          style={{
            borderColor: searchFocused ? "rgba(179,25,66,0.30)" : "rgba(207,218,232,0.92)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.98) 100%)",
            color: T.text,
            boxShadow: searchFocused
              ? "0 0 0 4px rgba(179,25,66,0.075), 0 12px 24px rgba(7,27,51,0.055)"
              : "0 8px 18px rgba(7,27,51,0.035)",
          }}
        />

        <button
          type="submit"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border transition-all active:scale-95"
          style={{
            color: rightSearchButtonColor,
            borderColor: rightSearchButtonActive ? "rgba(179,25,66,0.34)" : "rgba(207,218,232,0.86)",
            backgroundColor: rightSearchButtonActive ? "rgba(253,236,240,0.96)" : "rgba(255,255,255,0.86)",
          }}
          aria-label="Open search results"
          title="Search"
        >
          <Search size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  );

  return (
    <div className="sticky top-0 z-40 mb-2 md:mb-0">
      <div
        className="border-b backdrop-blur-xl"
        style={{
          borderColor: "rgba(207,218,232,0.82)",
          background:
            "linear-gradient(180deg, rgba(253,254,255,0.94) 0%, rgba(248,251,255,0.90) 100%)",
          boxShadow: "0 8px 24px rgba(7,27,51,0.045)",
        }}
      >
        <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-2.5 px-3 sm:px-4 md:h-[78px] md:gap-4 md:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Go to SoldierHub home">
            <Image
              src={LOGO_SRC}
              alt="SoldierHub"
              width={220}
              height={90}
              priority
              className="h-9 w-auto object-contain sm:h-10 md:h-14"
            />
          </Link>

          {searchForm()}

          <div className="flex-1 md:hidden" />

          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={() => goSearchPage({ includeQuery: false })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95"
              style={iconButtonStyle()}
              aria-label="Open search page"
            >
              <Search size={17} />
            </button>

            <button
              type="button"
              onClick={goNotifications}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95"
              style={iconButtonStyle({ alert: showNotificationBadge })}
              aria-label={
                showNotificationBadge
                  ? `Open notifications, ${notificationCount} unread`
                  : "Open notifications"
              }
            >
              <Bell size={17} />

              {showNotificationBadge && (
                <span
                  className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-1 text-[9px] font-bold leading-none shadow-sm"
                  style={{
                    backgroundColor: "#B31942",
                    borderColor: "rgba(255,255,255,0.95)",
                    color: "#FFFFFF",
                  }}
                >
                  {notificationBadgeText}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenu(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95"
              style={iconButtonStyle({ active: mobileMenu })}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              onClick={goNotifications}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 hover:shadow-sm"
              style={iconButtonStyle({ alert: showNotificationBadge })}
              aria-label={
                showNotificationBadge
                  ? `Open notifications, ${notificationCount} unread`
                  : "Open notifications"
              }
            >
              <Bell size={17} />

              {showNotificationBadge && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border px-1 text-[10px] font-bold leading-none shadow-sm"
                  style={{
                    backgroundColor: "#B31942",
                    borderColor: "rgba(255,255,255,0.95)",
                    color: "#FFFFFF",
                  }}
                >
                  {notificationBadgeText}
                </span>
              )}
            </button>

            {isAdmin && (
              <Link
                href="/resources"
                className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition hover:bg-white/60"
                style={{ color: T.navy }}
              >
                <BookMarked size={16} />
                Resources
              </Link>
            )}

            {safeUser?.role === "admin" && (
              <Button
                variant="secondary"
                icon={Shield}
                size="md"
                onClick={() => router.push("/admin")}
              >
                Admin
              </Button>
            )}

            {safeUser ? (
              <button
                type="button"
                onClick={goProfile}
                className="flex items-center gap-2 rounded-full border p-1 pr-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: "rgba(207,218,232,0.9)",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxShadow: "0 8px 18px rgba(7,27,51,0.04)",
                }}
              >
                <Avatar
                  name={displayName}
                  color={safeUser.avatar_color}
                  src={userAvatarUrl}
                  size={34}
                />

                <span className="text-sm font-semibold" style={{ color: T.text }}>
                  {firstName}
                </span>
              </button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setAuthModal("login")}>
                  Sign in
                </Button>

                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={() => setAuthModal("signup")}
                >
                  Join
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
