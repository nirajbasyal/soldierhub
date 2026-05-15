"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BookMarked,
  Loader2,
  Search,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import { findProfileByEmailForSearch } from "@/lib/db/profiles";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const EMAIL_SEARCH_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEARCH_ACTIVE_COLOR = "#B31942";
const SEARCH_IDLE_COLOR = "#9F3C55";
const LOGO_SRC = "/brand/soldierhub-logo-header.svg";

function isEmailSearch(value) {
  return EMAIL_SEARCH_PATTERN.test(String(value || "").trim().toLowerCase());
}

export default function TopNav() {
  const router = useRouter();
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const app = useApp() || {};
  const {
    currentUser,
    isAdmin = false,
    unreadCount = 0,
    search = "",
    setSearch = () => {},
    setAuthModal = () => {},
    pushToast = () => {},
  } = app;

  const safeUser = currentUser || null;
  const displayName = safeUser?.full_name || safeUser?.email || "SoldierHub user";
  const displayEmail = safeUser?.email || safeUser?.personal_email || "";
  const firstName = displayName.split(" ")[0] || "Profile";
  const userStatus = safeUser?.status || safeUser?.verification_status || "pending";
  const notificationCount = Math.max(0, Number(unreadCount) || 0);
  const showNotificationBadge =
    Boolean(safeUser) && userStatus === "verified" && notificationCount > 0;
  const notificationBadgeText = notificationCount > 99 ? "99+" : String(notificationCount);
  const hasSearchText = String(search || "").trim().length > 0;
  const searchIconColor = hasSearchText ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR;
  const rightSearchButtonActive = hasSearchText || searchFocused;
  const rightSearchButtonColor = rightSearchButtonActive ? "#8F1534" : SEARCH_IDLE_COLOR;

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

  const handleSearchSubmit = async (event) => {
    event?.preventDefault?.();

    const q = String(search || "").trim();

    if (!q) {
      setSearch("");
      router.push("/");
      return;
    }

    if (!isEmailSearch(q)) {
      router.push("/");
      return;
    }

    if (!safeUser) {
      setAuthModal("login");
      pushToast("Please sign in to search member profiles by email.", "info");
      return;
    }

    if (userStatus !== "verified") {
      router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
      return;
    }

    try {
      setProfileSearchLoading(true);

      const { data, error } = await findProfileByEmailForSearch(q);

      if (error || !data?.id) {
        pushToast(error?.message || "User not found.", "error");
        return;
      }

      setSearch("");
      setMobileSearchOpen(false);
      setSearchFocused(false);

      if (data.id === safeUser.id) {
        router.push("/profile");
        return;
      }

      router.push(
        `/profile/${encodeURIComponent(data.id)}?name=${encodeURIComponent(
          data.full_name || "SoldierHub member"
        )}`
      );
    } catch {
      pushToast("Could not search right now. Please try again.", "error");
    } finally {
      setProfileSearchLoading(false);
    }
  };

  const renderSearchSubmitIcon = (size = 17) => {
    if (profileSearchLoading) {
      return <Loader2 size={size} className="animate-spin" aria-hidden="true" />;
    }

    return <Search size={size} aria-hidden="true" />;
  };

  const searchForm = (mode = "desktop") => {
    const hideLeftIcon = mode === "mobile" && searchFocused;

    return (
      <form onSubmit={handleSearchSubmit} className={mode === "desktop" ? "hidden md:flex flex-1 max-w-sm ml-1" : "w-full"}>
        <div className="relative w-full">
          {!hideLeftIcon ? (
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: searchIconColor }}
            />
          ) : null}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              setSearchFocused(true);
              if (mode === "mobile") setMobileSearchOpen(true);
            }}
            onBlur={() => setSearchFocused(false)}
            placeholder={mode === "mobile" ? "Search posts or exact email…" : "Search posts or email"}
            autoComplete="off"
            inputMode="search"
            enterKeyHint="go"
            className={`w-full h-11 ${hideLeftIcon ? "pl-4" : "pl-11"} pr-16 rounded-2xl text-sm outline-none border shadow-sm transition-all`}
            style={{
              borderColor: searchFocused ? "rgba(179,25,66,0.34)" : T.border,
              backgroundColor: "rgba(253,254,255,0.92)",
              color: T.text,
              boxShadow: searchFocused ? "0 0 0 4px rgba(179,25,66,0.08)" : undefined,
            }}
          />

          <button
            type="submit"
            disabled={profileSearchLoading}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:cursor-wait disabled:opacity-80"
            style={{
              color: rightSearchButtonColor,
              borderColor: rightSearchButtonActive ? "rgba(143,21,52,0.42)" : "rgba(159,60,85,0.28)",
              backgroundColor: rightSearchButtonActive ? "rgba(179,25,66,0.13)" : "rgba(179,25,66,0.045)",
            }}
            aria-label={profileSearchLoading ? "Searching profile" : "Run search"}
            title={profileSearchLoading ? "Searching profile..." : "Search"}
          >
            {renderSearchSubmitIcon(16)}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="sticky top-0 z-40 mb-3 md:mb-0">
      <div
        className="border-b backdrop-blur-xl"
        style={{
          borderColor: "rgba(207,218,232,0.95)",
          background:
            "linear-gradient(180deg, rgba(253,254,255,0.96) 0%, rgba(243,246,251,0.92) 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-[68px] md:h-[84px] flex items-center gap-3 md:gap-5">
          <Link href="/" className="flex items-center shrink-0 min-w-0">
            <Image
              src={LOGO_SRC}
              alt="SoldierHub"
              width={220}
              height={90}
              priority
              className="h-11 md:h-16 w-auto object-contain"
            />
          </Link>

          {searchForm("desktop")}

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="md:hidden w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 transition-all active:scale-95"
            style={{
              borderColor: hasSearchText || mobileSearchOpen ? "rgba(179,25,66,0.35)" : "rgba(159,60,85,0.28)",
              backgroundColor: hasSearchText || mobileSearchOpen ? "rgba(179,25,66,0.08)" : "rgba(179,25,66,0.045)",
              color: hasSearchText || mobileSearchOpen ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR,
            }}
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
          >
            {mobileSearchOpen ? <X size={17} /> : <Search size={17} />}
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={goNotifications}
              className="relative w-11 h-11 rounded-2xl border flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-sm"
              style={{
                borderColor: T.border,
                backgroundColor: "rgba(253,254,255,0.92)",
                color: T.navy,
              }}
              aria-label={
                showNotificationBadge
                  ? `Open notifications, ${notificationCount} unread`
                  : "Open notifications"
              }
            >
              <Bell size={17} />

              {showNotificationBadge && (
                <span
                  className="absolute -right-1.5 -top-1.5 min-w-[19px] h-[19px] px-1 rounded-full border flex items-center justify-center text-[10px] font-bold leading-none shadow-sm"
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
                className="px-3 h-11 rounded-2xl text-sm font-semibold flex items-center gap-1.5"
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
                className="rounded-2xl border p-1 pr-3 flex items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{
                  borderColor: T.border,
                  backgroundColor: "rgba(253,254,255,0.95)",
                }}
              >
                <Avatar
                  name={displayName}
                  color={safeUser.avatar_color}
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

        {mobileSearchOpen ? (
          <div className="md:hidden px-4 pb-3 -mt-1">
            <div
              className="rounded-[20px] border p-2 shadow-sm"
              style={{ backgroundColor: T.card, borderColor: T.border }}
            >
              {searchForm("mobile")}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
