"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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

export default function MobileMenu() {
  const router = useRouter();

  const {
    currentUser,
    mobileMenu,
    setMobileMenu,
    setAuthModal,
    handleLogout,
  } = useApp();

  if (!mobileMenu) return null;

  const close = () => {
    setMobileMenu(false);
  };

  const go = (path) => {
    close();

    window.setTimeout(() => {
      router.push(path);
    }, 0);
  };

  const openAuth = (mode) => {
    close();

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
    close();

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
          <div className="flex items-center gap-3">
            <Image
              src="/brand/soldierhub-icon.png"
              alt="SoldierHub"
              width={42}
              height={42}
              priority
              className="h-10 w-10 object-contain rounded-lg"
            />

            <div>
              <div
                className="text-base font-bold leading-none"
                style={{ color: T.navy }}
              >
                Soldier Hub
              </div>

              <div className="text-xs mt-1" style={{ color: T.textSubtle }}>
                Connect · Share · Support
              </div>
            </div>
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

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {!currentUser ? (
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
          ) : (
            <button
              type="button"
              onClick={goProfile}
              className="rounded-xl border p-3.5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm"
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