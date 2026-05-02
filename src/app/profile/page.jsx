"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import ProfileHeader from "@/components/profile/ProfileHeader";
import UserPostList from "@/components/profile/UserPostList";

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, authLoading, setAuthModal, handleLogout } = useApp();

  // Guard: not signed in → bounce home + open auth modal
  useEffect(() => {
    if (authLoading) return; // wait for session check
    if (!currentUser) {
      router.replace("/");
      setAuthModal("login");
      return;
    }
    if (currentUser.status !== "verified") {
      router.replace(
        `/pending-review?email=${encodeURIComponent(currentUser.email)}&name=${encodeURIComponent(currentUser.full_name)}&found=1`
      );
    }
  }, [authLoading, currentUser, router, setAuthModal]);

  if (authLoading) return null;
  if (!currentUser || currentUser.status !== "verified") return null;

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{ backgroundColor: T.bg }}
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="flex items-center justify-between mb-6">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/")}>
              Back to feed
            </Button>
            <Button variant="ghost" icon={LogOut} onClick={handleLogout}>
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
