"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  BookMarked,
  Loader2,
  Menu,
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
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchNotice, setSearchNotice] = useState(null);

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
    pushToast = () => {},
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
  const rightSearchButtonColor = rightSearchButtonActive ? "#8F1534" : SEARCH_IDLE_COLOR;

  const clearSearchNotice = () => {
    if (searchNotice) setSearchNotice(null);
  };

  const showSearchNotice = ({ title, message, type = "error" }) => {
    setSearchNotice({ title, message, type });
    setMobileSearchOpen(true);
  };

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
      clearSearchNotice();
      setSearch("");
      router.push("/");
      return;
    }

    if (!isEmailSearch(q)) {
      if (q.includes("@")) {
        showSearchNotice({
          title: "Invalid email format",
          message: "Enter the full email address, like name@example.com.",
        });
        return;
      }

      clearSearchNotice();
      router.push("/");
      return;
    }

    if (!safeUser) {
      showSearchNotice({
        title: "Sign in required",
        message: "Please sign in to search member profiles by email.",
        type: "info",
      });
      setAuthModal("login");
      pushToast("Please sign in to search member profiles by email.", "info");
      return;
    }

    if (userStatus !== "verified") {
      clearSearchNotice();
      router.push(
        `/pending-review?email=${encodeURIComponent(displayEmail)}&name=${encodeURIComponent(displayName)}&found=1`
      );
      return;
    }

    try {
      setProfileSearchLoading(true);
      clearSearchNotice();

      const { data, error } = await findProfileByEmailForSearch(q);

      if (error || !data?.id) {
        showSearchNotice({
          title: "User not found",
          message: "No verified SoldierHub profile matched that email. Please check the spelling and try again.",
        });
        return;
      }

      setSearch("");
      setMobileSearchOpen(false);
      setSearchFocused(false);
      setSearchNotice(null);

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
      showSearchNotice({
        title: "Search unavailable",
        message: "Could not search right now. Please try again in a moment.",
      });
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

  const renderSearchNotice = () => {
    if (!searchNotice) return null;

    const isInfo = searchNotice.type === "info";

    return (
      <div
        className="mt-2 rounded-2xl border px-3.5 py-3 shadow-sm"
        style={{
          backgroundColor: isInfo ? "rgba(239,246,255,0.96)" : "rgba(255,241,245,0.96)",
          borderColor: isInfo ? "rgba(63,95,125,0.24)" : "rgba(179,25,66,0.22)",
          boxShadow: isInfo
            ? "0 10px 24px rgba(63,95,125,0.08)"
            : "0 10px 24px rgba(179,25,66,0.08)",
        }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-2.5">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: isInfo ? "rgba(63,95,125,0.12)" : "rgba(179,25,66,0.1)",
              color: isInfo ? T.navy : SEARCH_ACTIVE_COLOR,
            }}
          >
            <AlertCircle size={17} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-extrabold leading-5"
              style={{ color: isInfo ? T.navy : SEARCH_ACTIVE_COLOR }}
            >
              {searchNotice.title}
            </div>
            <div className="mt-0.5 text-xs leading-5" style={{ color: T.textSubtle }}>
              {searchNotice.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSearchNotice(null)}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95"
            style={{ color: T.textSubtle }}
            aria-label="Dismiss search message"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  const searchForm = (mode = "desktop") => {
    const hideLeftIcon = mode === "mobile" && searchFocused;
    const isMobile = mode === "mobile";

    return (
      <form
        onSubmit={handleSearchSubmit}
        className={mode === "desktop" ? "hidden md:flex flex-1 max-w-sm ml-1" : "w-full"}
      >
        <div className="w-full">
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
              onChange={(e) => {
                setSearch(e.target.value);
                clearSearchNotice();
              }}
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

          {isMobile ? renderSearchNotice() : null}
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

          <div className="md:hidden flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen((open) => !open);
                if (mobileSearchOpen) setSearchNotice(null);
              }}
              className="w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 transition-all active:scale-95"
              style={{
                borderColor: hasSearchText || mobileSearchOpen ? "rgba(179,25,66,0.35)" : "rgba(159,60,85,0.28)",
                backgroundColor: hasSearchText || mobileSearchOpen ? "rgba(179,25,66,0.08)" : "rgba(179,25,66,0.045)",
                color: hasSearchText || mobileSearchOpen ? SEARCH_ACTIVE_COLOR : SEARCH_IDLE_COLOR,
              }}
              aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            >
              {mobileSearchOpen ? <X size={17} /> : <Search size={17} />}
            </button>

            <button
              type="button"
              onClick={goNotifications}
              className="relative w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 transition-all active:scale-95"
              style={{
                borderColor: showNotificationBadge ? "rgba(179,25,66,0.35)" : T.border,
                backgroundColor: showNotificationBadge ? "rgba(179,25,66,0.08)" : "rgba(253,254,255,0.92)",
                color: showNotificationBadge ? SEARCH_ACTIVE_COLOR : T.navy,
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
                  className="absolute -right-1.5 -top-1.5 min-w-[18px] h-[18px] px-1 rounded-full border flex items-center justify-center text-[9px] font-bold leading-none shadow-sm"
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
              className="w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 transition-all active:scale-95"
              style={{
                borderColor: mobileMenu ? "rgba(179,25,66,0.35)" : T.border,
                backgroundColor: mobileMenu ? "rgba(179,25,66,0.08)" : "rgba(253,254,255,0.92)",
                color: mobileMenu ? SEARCH_ACTIVE_COLOR : T.navy,
              }}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>

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

        {mobileSearchOpen ? (
          <div className="md:hidden px-4 pb-3 -mt-1">
            <div
              className="rounded-[24px] border p-2 shadow-sm"
              style={{
                backgroundColor: T.card,
                borderColor: searchNotice ? "rgba(179,25,66,0.18)" : T.border,
                boxShadow: searchNotice
                  ? "0 16px 36px rgba(179,25,66,0.08)"
                  : "0 12px 28px rgba(11,28,44,0.06)",
              }}
            >
              {searchForm("mobile")}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
