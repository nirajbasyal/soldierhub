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

  const app = useApp() || {};
  const {
    currentUser,
    search = "",
    setSearch = () => {},
    setAuthModal = () => {},
    setMobileMenu = () => {},
  } = app;

  const safeUser = currentUser || null;
  const displayName = safeUser?.full_name || safeUser?.email || "SoldierHub user";
  const displayEmail = safeUser?.email || safeUser?.personal_email || "";
  const firstName = displayName.split(" ")[0] || "Profile";
  const userStatus = safeUser?.status || safeUser?.verification_status || "pending";

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
            src="/brand/soldierhub-logo.png"
            alt="SoldierHub"
            width={220}
            height={64}
            priority
            className="h-10 sm:h-11 md:h-12 w-auto object-contain max-w-[170px] sm:max-w-[220px] drop-shadow-sm"
          />
        </Link>

        <div className="hidden md:flex flex-1 max-w-lg">
          <div className="relative w-full group">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: T.textSubtle }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts, people, places…"
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

            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border px-2 py-1 text-[11px] font-semibold"
              style={{
                color: T.textSubtle,
                borderColor: T.borderSoft,
                backgroundColor: T.surface,
              }}
            >
              Ctrl K
            </span>
          </div>
        </div>

        <div className="flex-1 md:flex-none" />

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/resources"
            className="px-3 h-11 rounded-2xl text-sm font-semibold flex items-center gap-1.5 transition-all hover:shadow-sm"
            style={{ color: T.navy }}
          >
            <BookMarked size={16} />
            Resources
          </Link>

          {safeUser ? (
            <>
              <button
                type="button"
                onClick={goNotifications}
                className="relative w-11 h-11 rounded-2xl border flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-sm"
                style={{
                  borderColor: T.border,
                  backgroundColor: "rgba(253,254,255,0.92)",
                  color: T.navy,
                }}
                aria-label="Open notifications"
              >
                <Bell size={17} />
              </button>

              {safeUser.role === "admin" && (
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
            className="w-full h-11 pl-10 pr-4 rounded-2xl text-sm outline-none border shadow-sm"
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
