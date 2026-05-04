"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import ProfileHeader from "@/components/profile/ProfileHeader";
import UserPostList from "@/components/profile/UserPostList";

export default function ProfilePage() {
  const router = useRouter();

  const {
    currentUser,
    authLoading,
    setAuthModal,
    handleLogout,
  } = useApp();

  const userStatus =
    currentUser?.status ||
    currentUser?.verification_status ||
    "pending";

  const isVerified = userStatus === "verified";

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.replace("/");
      setAuthModal?.("login");
      return;
    }

    if (!isVerified) {
      const email = encodeURIComponent(currentUser?.email || "");
      const name = encodeURIComponent(currentUser?.full_name || "SoldierHub user");

      router.replace(`/pending-review?email=${email}&name=${name}&found=1`);
    }
  }, [authLoading, currentUser, isVerified, router, setAuthModal]);

  if (authLoading) {
    return (
      <AppShell hideNav>
        <main
          className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-12"
          style={{ backgroundColor: T.bg }}
        >
          <div
            className="rounded-2xl border px-5 py-4 text-sm"
            style={{
              backgroundColor: T.card,
              borderColor: T.border,
              color: T.textMuted,
            }}
          >
            Loading profile...
          </div>
        </main>
      </AppShell>
    );
  }

  if (!currentUser) {
    return (
      <AppShell hideNav>
        <main
          className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-12"
          style={{ backgroundColor: T.bg }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 text-center"
            style={{
              backgroundColor: T.card,
              borderColor: T.border,
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ backgroundColor: T.goldBg, color: T.gold }}
            >
              <UserRound size={22} />
            </div>

            <h1
              className="text-2xl font-serif mb-2"
              style={{ color: T.navy }}
            >
              Sign in required
            </h1>

            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: T.textMuted }}
            >
              Please sign in to view your profile.
            </p>

            <Button
              variant="primary"
              onClick={() => {
                router.push("/");
                setAuthModal?.("login");
              }}
            >
              Go to sign in
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!isVerified) {
    return (
      <AppShell hideNav>
        <main
          className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-12"
          style={{ backgroundColor: T.bg }}
        >
          <div
            className="rounded-2xl border px-5 py-4 text-sm"
            style={{
              backgroundColor: T.card,
              borderColor: T.border,
              color: T.textMuted,
            }}
          >
            Redirecting to account review...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{ backgroundColor: T.bg }}
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => router.push("/")}
            >
              Back to feed
            </Button>

            <Button
              variant="ghost"
              icon={LogOut}
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>

          <ProfileHeader />
          <UserPostList />

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}