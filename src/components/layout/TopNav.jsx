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
} from "lucide-react";
import { findProfileByEmailForSearch } from "@/lib/db/profiles";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const EMAIL_SEARCH_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEARCH_ACTIVE_COLOR = "#B31942";
const LOGO_SRC = "/brand/soldierhub-logo-connect.svg";

function isEmailSearch(value) {
  return EMAIL_SEARCH_PATTERN.test(String(value || "").trim().toLowerCase());
}

export default function TopNav() {
  const router = useRouter();
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);

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
  const firstName = displayName.split(" ")[0] || "Profile";
  const notificationCount = Math.max(0, Number(unreadCount) || 0);
  const showNotificationBadge = Boolean(safeUser) && notificationCount > 0;
  const notificationBadgeText = notificationCount > 99 ? "99+" : String(notificationCount);
  const hasSearchText = String(search || "").trim().length > 0;
  const searchIconColor = hasSearchText ? SEARCH_ACTIVE_COLOR : T.textSubtle;

  const goProfile = () => {
    if (!safeUser) return setAuthModal("login");
    router.push("/profile");
  };

  const goNotifications = () => {
    if (!safeUser) return setAuthModal("login");
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

    try {
      setProfileSearchLoading(true);
      const { data, error } = await findProfileByEmailForSearch(q);

      if (error || !data?.id) {
        pushToast(error?.message || "User not found.", "error");
        return;
      }

      setSearch("");
      router.push(`/profile/${encodeURIComponent(data.id)}`);
    } catch {
      pushToast("Could not search right now. Please try again.", "error");
    } finally {
      setProfileSearchLoading(false);
    }
  };

  return (
    <div
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        borderColor: "rgba(207,218,232,0.95)",
        background:
          "linear-gradient(180deg, rgba(253,254,255,0.96) 0%, rgba(243,246,251,0.92) 100%)",
      }}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#B31942] via-[#FDFEFF] to-[#1E4E8C]" />

      <div className="max-w-6xl mx-auto px-4 md:px-6 h-[84px] flex items-center gap-5">
        <Link href="/" className="flex items-center shrink-0 min-w-0">
          <Image
            src={LOGO_SRC}
            alt="SoldierHub"
            width={250}
            height={100}
            priority
            className="h-16 md:h-[72px] w-auto object-contain"
          />
        </Link>

        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-sm ml-1">
          <div className="relative w-full">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: searchIconColor }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts or email"
              autoComplete="off"
              inputMode="search"
              className="w-full h-11 pl-11 pr-14 rounded-2xl text-sm outline-none border shadow-sm"
              style={{
                borderColor: T.border,
                backgroundColor: "rgba(253,254,255,0.90)",
                color: T.text,
              }}
            />

            <button
              type="submit"
              disabled={profileSearchLoading}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border"
              style={{
                color: searchIconColor,
                borderColor: hasSearchText ? "rgba(179,25,66,0.35)" : T.borderSoft,
                backgroundColor: hasSearchText ? "rgba(179,25,66,0.08)" : T.surface,
              }}
            >
              {profileSearchLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
            </button>
          </div>
        </form>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={goNotifications}
            className="relative w-11 h-11 rounded-2xl border flex items-center justify-center"
            style={{
              borderColor: T.border,
              backgroundColor: "rgba(253,254,255,0.92)",
              color: T.navy,
            }}
          >
            <Bell size={17} />

            {showNotificationBadge && (
              <span
                className="absolute -right-1.5 -top-1.5 min-w-[19px] h-[19px] px-1 rounded-full border flex items-center justify-center text-[10px] font-bold"
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
              className="rounded-2xl border p-1 pr-3 flex items-center gap-2"
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
    </div>
  );
}
