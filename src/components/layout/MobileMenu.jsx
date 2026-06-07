"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookMarked,
  BookOpen,
  Calculator,
  Compass,
  Loader2,
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

const SIDEBAR_LOGO_SRC = "/brand/soldierhub-logo-sidebar.svg";

function getPathnameOnly(path = "") {
  return String(path || "").split("?")[0] || "/";
}

function PageLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[110] md:hidden flex items-center justify-center px-6"
      style={{ backgroundColor: T.bg }}
    >
      <div className="w-full max-w-xs text-center">
        <div className="flex justify-center mb-5">
          <Image
            src={SIDEBAR_LOGO_SRC}
            alt="SoldierHub"
            width={240}
            height={80}
            priority
            className="h-14 w-auto object-contain"
          />
        </div>

        <div
          className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center border"
          style={{ backgroundColor: T.card, borderColor: T.border }}
        >
          <Loader2 size={22} className="animate-spin" style={{ color: T.navy }} />
        </div>

        <p className="mt-4 text-sm font-semibold" style={{ color: T.text }}>
          Opening page
        </p>
        <p className="mt-1 text-xs leading-5" style={{ color: T.textSubtle }}>
          Loading SoldierHub content…
        </p>
      </div>
    </div>
  );
}

export default function MobileMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState("");

  const {
    currentUser,
    isAdmin = false,
    mobileMenu,
    setMobileMenu,
    setAuthModal,
    handleLogout,
  } = useApp();

  const navigatingPathname = useMemo(
    () => getPathnameOnly(navigatingTo),
    [navigatingTo]
  );

  const isNavigating = Boolean(navigatingTo);

  useEffect(() => {
    if (!navigatingTo) return;

    if (pathname === navigatingPathname) {
      const timer = window.setTimeout(() => {
        setNavigatingTo("");
        setMobileMenu(false);
      }, 120);

      return () => window.clearTimeout(timer);
    }
  }, [navigatingTo, navigatingPathname, pathname, setMobileMenu]);

  useEffect(() => {
    if (!mobileMenu) return;

    if (isAdmin) {
      router.prefetch?.("/resources");
      router.prefetch?.("/admin");
    }

    router.prefetch?.("/tools/bah");
    router.prefetch?.("/tools/gates");
    router.prefetch?.("/tools/board-prep");
  }, [isAdmin, mobileMenu, router]);

  if (isNavigating) {
    return <PageLoadingScreen />;
  }

  if (!mobileMenu) return null;

  const close = () => {
    setMobileMenu(false);
  };

  const go = (path) => {
    const nextPathname = getPathnameOnly(path);

    if (pathname === nextPathname) {
      setMobileMenu(false);
      return;
    }

    setNavigatingTo(path);
    setMobileMenu(false);
    router.push(path);
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
                hint={
                  isAdmin
                    ? "Official sites and trusted services"
                    : "Admin is preparing trusted resources"
                }
                badge={isAdmin ? undefined : "Coming Soon"}
                disabled={!isAdmin}
                onClick={isAdmin ? () => go("/resources") : undefined}
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

              <MenuItem
                icon={BookOpen}
                label="Board Prep"
                hint="Daily promotion board questions"
                onClick={() => go("/tools/board-prep")}
              />

              <MenuItem
                icon={Activity}
                label="AFT Score Calculator"
                hint="Army fitness score tool"
                badge="Coming Soon"
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
