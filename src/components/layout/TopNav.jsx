"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BookMarked,
  Loader2,
  Menu,
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
    setMobileMenu = () => {},
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
  const notificationBadgeText =
    notificationCount > 99 ? "99+" : String(notificationCount);
  const hasSearchText = String(search || "").trim().length > 0;
  const searchIconColor = hasSearchText ? SEARCH_ACTIVE_COLOR : T.textSubtle;

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

    // Normal text stays as post search. This keeps the current feed search behavior,
    // and pressing Enter from another page returns the user to the feed with the same query.
    if (!isEmailSearch(q)) {
      router.push("/");
      return;
    }

    // Email profile lookup is protected because profile emails should not be publicly enumerable.
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

  return (
    <div
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        borderColor: "rgba(207,218,232,0.95)",
        background:
          "linear-gradient(180deg, rgba(253,254,255,0.94) 0%, rgba(243,246,251,0.90) 100%)",
      }}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#B31942] via-[#FDFEFF] to-[#1E4E8C]" />

      <div className="max-w-6xl mx-auto px-4 md:px-6 h-[72px] flex items-center gap-3 md:gap-5">
        <Link href="/" className="flex items-center shrink-0 min-w-0">
          <Image
            src="/brand/soldierhub-logo-red.svg"
            alt="SoldierHub"
            width={220}
            height={64}
            priority
            className="h-10 sm:h-11 md:h-12 w-auto object-contain max-w-[170px] sm:max-w-[220px] drop-shadow-sm"
          />
        </Link>

        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg">
          <div className="relative w-full group">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: searchIconColor }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts or exact email…"
              autoComplete="off"
              inputMode="search"
              className="w-full h-12 pl-11 pr-16 rounded-2xl text-sm outline-none border shadow-sm transition-all"
              style={{
                borderColor: T.border,
                backgroundColor: "rgba(253,254,255,0.88)",
                color: T.text,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = T.blue;
                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(30,78,140,0.10)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(7,27,51,0.05)";
              }}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
