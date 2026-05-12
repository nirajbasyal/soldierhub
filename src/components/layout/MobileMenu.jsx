"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
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
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import MenuItem from "@/components/ui/MenuItem";
import SiteInfoCard from "@/components/tools/SiteInfoCard";

function getPathnameOnly(path = "") {
  return String(path || "").split("?")[0] || "/";
}

export default function MobileMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState("");

  const {
    currentUser,
    mobileMenu,
    setMobileMenu,
    setAuthModal,
    handleLogout,
  } = useApp();

  const navigatingPathname = useMemo(
    () => getPathnameOnly(navigatingTo),
    [navigatingTo]
  );

  useEffect(() => {
    if (!mobileMenu || !navigatingTo) return;

    if (pathname === navigatingPathname) {
      setNavigatingTo("");
      setMobileMenu(false);
    }
  }, [mobileMenu, navigatingTo, navigatingPathname, pathname, setMobileMenu]);

  useEffect(() => {
    if (!mobileMenu) return;

    router.prefetch?.("/profile");
    router.prefetch?.("/notifications");
    router.prefetch?.("/resources");
    router.prefetch?.("/tools/bah");
    router.prefetch?.("/tools/gates");
    router.prefetch?.("/admin");
  }, [mobileMenu, router]);

  if (!mobileMenu) return null;

  const isNavigating = Boolean(navigatingTo);

  const close = () => {
    if (isNavigating) return;
    setMobileMenu(false);
  };

  const go = (path) => {
    const nextPathname = getPathnameOnly(path);

    if (pathname === nextPathname) {
      setNavigatingTo("");
      setMobileMenu(false);
      return;
    }

    setNavigatingTo(path);
    router.push(path);
  };

  const openAuth = (mode) => {
    if (isNavigating) return;
    setMobileMenu(false);

    window.setTimeout(() => {
      setAuthModal(mode);
    }, 0);
  };

  const goProfile = () => {
    if (!currentUser) {
      openAuth("login");
      return;
    }

    const userStatus =
      currentUser?.status || currentUser?.verification_status || "pending";

    if (userStatus !== "verified") {
      const email = encodeURIComponent(currentUser?.email || "");
      const name = encodeURIComponent(
        currentUser?.full_name || "SoldierHub user"
      );

      go(`/pending-review?email=${email}&name=${name}&found=1`);
      return;
    }

    go("/profile");
  };

  const logout = async () => {
    if (isNavigating) return;
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
        {/* Header */}
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b z-10"
          style={{ backgroundColor: T.bg, borderColor: T.border }}
        >
          <div className="flex items-center min-w-0">
            <Image
              src="/brand/soldierhub-logo.png"
              alt="SoldierHub"
              width={220}
              height={72}
              priority
              className="h-12 w-auto object-contain max-w-[210px]"
            />
          </div>

          <button
            type="button"
            onClick={close}
            disabled={isNavigating}
            className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-45"
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

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {isNavigating && (
            <div
              className="rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.textMuted,
              }}
            >
              Opening page…
            </div>
          )}

          {!currentUser ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                icon={LogIn}
                onClick={() => openAuth("login")}
                disabled={isNavigating}
              >
                Sign in
              </Button>

              <Button
                variant="secondary"
                size="lg"
                icon={UserPlus}
                onClick={() => openAuth("signup")}
                disabled={isNavigating}
              >
                Create account
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={goProfile}
              disabled={isNavigating}
              className="rounded-xl border p-3.5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm disabled:opacity-70"
              style={{ backgroundColor: T.card, borderColor: T.border }}
            >
              <Avatar
                name={currentUser?.full_name || "SoldierHub user"}
                color={currentUser?.avatar_color}
                size={42}
              />

              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold truncate"
                  style={{ color: T.text }}
                >
                  {currentUser?.full_name || "SoldierHub user"}
                </div>

                <div
                  className="text-xs truncate"
                  style={{ color: T.textSubtle }}
                >
                  {currentUser?.email || currentUser?.personal_email || ""}
                </div>
              </div>

              <ChevronRight
                size={16}
                style={{ color: T.textSubtle }}
                className="shrink-0"
              />
            </button>
          )}

          {currentUser?.role === "admin" && (
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
                hint="Official sites and trusted services"
                onClick={() => go("/resources")}
              />
            </div>
          </div>

          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2"
              style={{ color: T.textSubtle }}
            >
              Base Info
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
