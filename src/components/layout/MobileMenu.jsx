"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookMarked,
  BookOpen,
  Calculator,
  ChevronRight,
  Compass,
  LogIn,
  LogOut,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Button from "@/components/ui/Button";
import MenuItem from "@/components/ui/MenuItem";
import SiteInfoCard from "@/components/tools/SiteInfoCard";
import { BoardPrepStatusBadge } from "@/components/tools/BoardPrepCard";

const SIDEBAR_LOGO_SRC = "/brand/soldierhub-logo-sidebar.svg";

function getPathnameOnly(path = "") {
  return String(path || "").split("?")[0] || "/";
}

function BoardPrepMenuCard({ onClick, signedIn = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border p-3.5 text-left transition-shadow hover:shadow-sm"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.surface }}
        >
          <BookOpen size={16} strokeWidth={2.25} style={{ color: T.text }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: T.text }}>
              Board Prep
            </div>
          </div>
          <div className="text-xs mt-0.5" style={{ color: T.textSubtle }}>
            {signedIn ? "Daily quiz, streaks, and study cards" : "Study all board questions"}
          </div>
          {signedIn && (
            <div className="mt-2">
              <BoardPrepStatusBadge variant="menu" />
            </div>
          )}
        </div>

        <ChevronRight size={16} style={{ color: T.textSubtle }} className="shrink-0" />
      </div>
    </button>
  );
}

export default function MobileMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    currentUser,
    isAdmin = false,
    mobileMenu,
    setMobileMenu,
    setAuthModal,
    handleLogout,
  } = useApp();

  const boardPrepPath = currentUser ? "/tools/board-prep" : "/tools/board-prep/study";

  useEffect(() => {
    if (!mobileMenu) return;

    if (isAdmin) {
      router.prefetch?.("/admin");
    }

    router.prefetch?.("/tools/bah");
    router.prefetch?.("/tools/gates");
    router.prefetch?.("/tools/board-prep");
    router.prefetch?.("/tools/board-prep/study");
  }, [isAdmin, mobileMenu, router]);

  if (!mobileMenu) return null;

  const close = () => {
    setMobileMenu(false);
  };

  const go = (path) => {
    const nextPathname = getPathnameOnly(path);

    setMobileMenu(false);

    if (pathname === nextPathname) {
      return;
    }

    window.setTimeout(() => {
      router.push(path);
    }, 0);
  };

  const openAuth = (mode) => {
    setMobileMenu(false);

    window.setTimeout(() => {
      setAuthModal(mode);
    }, 0);
  };

  const logout = async () => {
    setMobileMenu(false);

    window.setTimeout(async () => {
      await handleLogout?.();
    }, 0);
  };

  return (
    <div
      className="fixed inset-0 z-[90] md:hidden"
      onClick={close}
      style={{
        backgroundColor: "rgba(11,28,44,0.45)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm overflow-y-auto"
        style={{ backgroundColor: T.bg, animation: "slideIn 240ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b z-10"
          style={{ backgroundColor: T.bg, borderColor: T.border }}
        >
          <div className="flex items-center min-w-0">
            <Image
              src={SIDEBAR_LOGO_SRC}
              alt="SoldierHub"
              width={260}
              height={80}
              priority
              className="h-12 w-auto object-contain max-w-[230px]"
            />
          </div>

          <button
            type="button"
            onClick={close}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              color: T.text,
            }}
            aria-label="Close mobile menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {!currentUser && (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                icon={LogIn}
                onClick={() => openAuth("login")}
              >
                Sign in
              </Button>

              <Button
                variant="secondary"
                size="lg"
                icon={UserPlus}
                onClick={() => openAuth("signup")}
              >
                Create account
              </Button>
            </div>
          )}

          {isAdmin && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2"
                style={{ color: T.textSubtle }}
              >
                Admin
              </div>

              <div className="flex flex-col gap-2">
                <MenuItem
                  icon={Shield}
                  label="Admin dashboard"
                  hint="Pending users, reports, and resources"
                  onClick={() => go("/admin")}
                />
              </div>
            </div>
          )}

          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2"
              style={{ color: T.textSubtle }}
            >
              Fort Bliss
            </div>

            <div className="flex flex-col gap-2">
              <MenuItem
                icon={BookMarked}
                label="Resources"
                hint="Temporarily unavailable"
                badge="Soon"
                disabled
              />
            </div>
          </div>

          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2"
              style={{ color: T.textSubtle }}
            >
              Soldier Tools & Info
            </div>

            <div className="flex flex-col gap-2">
              <MenuItem
                icon={Calculator}
                label="BAH Estimate"
                hint="Calculate housing allowance"
                onClick={() => go("/tools/bah")}
              />

              <MenuItem
                icon={Compass}
                label="Gate Hours"
                hint="Fort Bliss gate schedule"
                onClick={() => go("/tools/gates")}
              />

              <BoardPrepMenuCard signedIn={Boolean(currentUser)} onClick={() => go(boardPrepPath)} />

              <MenuItem
                icon={Activity}
                label="AFT Score Calculator"
                hint="Temporarily unavailable"
                badge="Soon"
                disabled
              />
            </div>
          </div>

          {currentUser && (
            <div className="pt-2">
              <MenuItem
                icon={LogOut}
                label="Sign out"
                danger
                onClick={logout}
              />
            </div>
          )}

          <div className="pt-2">
            <SiteInfoCard
              onNavigate={(path) => {
                if (path) {
                  go(path);
                } else {
                  close();
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
