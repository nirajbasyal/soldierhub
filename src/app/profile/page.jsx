"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import ProfileHeader from "@/components/profile/ProfileHeader";
import UserPostList from "@/components/profile/UserPostList";

function ProfileStatusCard({ icon: Icon, title, body, action }) {
  return (
    <AppShell hideNav>
      <main
        className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div
          className="w-full max-w-md rounded-[28px] border p-6 text-center"
          style={{
            backgroundColor: T.card,
            borderColor: "#D5E2F2",
            boxShadow: "0 18px 44px rgba(7,27,51,0.08)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
          >
            <Icon size={24} />
          </div>

          <h1 className="text-2xl font-extrabold mb-2" style={{ color: T.navy }}>
            {title}
          </h1>

          <p className="text-sm leading-7 mb-5" style={{ color: T.textMuted }}>
            {body}
          </p>

          {action}
        </div>
      </main>
    </AppShell>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const { currentUser, authLoading, setAuthModal, handleLogout } = useApp();

  const userStatus =
    currentUser?.status || currentUser?.verification_status || "pending";

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
      <ProfileStatusCard
        icon={UserRound}
        title="Loading profile"
        body="Getting your SoldierHub profile ready."
      />
    );
  }

  if (!currentUser) {
    return (
      <ProfileStatusCard
        icon={UserRound}
        title="Sign in required"
        body="Please sign in to view your profile."
        action={
          <Button
            variant="primary"
            onClick={() => {
              router.push("/");
              setAuthModal?.("login");
            }}
          >
            Go to sign in
          </Button>
        }
      />
    );
  }

  if (!isVerified) {
    return (
      <ProfileStatusCard
        icon={UserRound}
        title="Redirecting to account review"
        body="Your account needs verification before your profile is available."
      />
    );
  }

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="soldierhub-profile-shell mx-auto w-full max-w-[660px] px-4 py-4 sm:px-5 md:px-6 md:py-6">
          <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.86)",
                borderColor: "#D5E2F2",
                color: T.navy,
              }}
            >
              <ArrowLeft size={16} />
              Back to feed
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.86)",
                borderColor: "#D5E2F2",
                color: T.textMuted,
              }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>

          <ProfileHeader />

          <UserPostList />

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
