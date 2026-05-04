"use client";

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

export default function TopNav() {
  const router = useRouter();

  const {
    currentUser,
    unreadCount,
    search,
    setSearch,
    setAuthModal,
    setMobileMenu,
  } = useApp();

  const goProfile = () => {
    if (!currentUser) return setAuthModal("login");

    if (currentUser.status !== "verified") {
      return router.push(
        `/pending-review?email=${encodeURIComponent(
          currentUser.email
        )}&name=${encodeURIComponent(currentUser.full_name)}&found=1`
      );
    }

    router.push("/profile");
  };

  const goNotifications = () => {
    if (!currentUser) return setAuthModal("login");
    router.push("/notifications");
  };

  return (
    <div
      className="border-b"
      style={{ borderColor: T.border, backgroundColor: T.bg }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3 md:gap-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Mobile: icon + Soldier Hub text */}
          <div className="flex sm:hidden items-center gap-2 min-w-0">
            <Image
              src="/brand/soldierhub-icon.png"
              alt="SoldierHub"
              width={36}
              height={36}
              priority
              className="h-9 w-9 object-contain rounded-lg shrink-0"
            />

            <span
              className="text-lg font-bold tracking-tight leading-none whitespace-nowrap"
              style={{ color: T.navy }}
            >
              Soldier Hub
            </span>
          </div>

          {/* Tablet/Desktop: full transparent logo */}
          <Image
            src="/brand/soldierhub-logo.png"
            alt="SoldierHub"
            width={220}
            height={64}
            priority
            className="hidden sm:block h-11 w-auto object-contain"
          />
        </Link>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: T.textSubtle }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts, people, places…"
              className="w-full h-10 pl-10 pr-4 rounded-xl text-sm outline-none border"
              style={{
                borderColor: T.border,
                backgroundColor: T.card,
                color: T.text,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = T.navy;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = T.border;
              }}
            />
          </div>
        </div>

        <div className="flex-1 md:flex-none" />

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/resources"
            className="px-3 h-10 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={{ color: T.textMuted }}
          >
            <BookMarked size={15} />
            Resources
          </Link>

          {currentUser ? (
            <>
              <button
                type="button"
                onClick={goNotifications}
                className="relative w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                style={{
                  borderColor: T.border,
                  backgroundColor: T.card,
                  color: T.text,
                }}
                aria-label="Open notifications"
              >
                <Bell size={16} />

                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold flex items-center justify-center px-1"
                    style={{ backgroundColor: T.gold, color: "#fff" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {currentUser.role === "admin" && (
                <Button
                  variant="secondary"
                  icon={Shield}
                  size="md"
                  onClick={() => router.push("/admin")}
                >
                  Admin
                </Button>
              )}

              <button
                type="button"
                onClick={goProfile}
                className="rounded-xl border p-1 pr-3 flex items-center gap-2 hover:shadow-sm transition-shadow"
                style={{ borderColor: T.border, backgroundColor: T.card }}
              >
                <Avatar
                  name={currentUser.full_name}
                  color={currentUser.avatar_color}
                  size={32}
                />

                <span className="text-sm font-medium" style={{ color: T.text }}>
                  {currentUser.full_name?.split(" ")[0]}
                </span>
              </button>
            </>
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

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenu(true)}
          className="md:hidden w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
          style={{
            borderColor: T.border,
            backgroundColor: T.card,
            color: T.text,
          }}
          aria-label="Open mobile menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: T.textSubtle }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-full h-10 pl-10 pr-4 rounded-xl text-sm outline-none border"
            style={{
              borderColor: T.border,
              backgroundColor: T.card,
              color: T.text,
            }}
          />
        </div>
      </div>
    </div>
  );
}