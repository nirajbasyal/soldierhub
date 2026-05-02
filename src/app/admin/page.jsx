"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, Shield, UserCheck, Users } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import PendingUsersList from "@/components/admin/PendingUsersList";
import ReportedPostsList from "@/components/admin/ReportedPostsList";
import MembersList from "@/components/admin/MembersList";

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, authLoading, pendingUsers, posts, users } = useApp();
  const [tab, setTab] = useState("pending");

  // Guard: only admins
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { router.replace("/"); return; }
    if (currentUser.role !== "admin") router.replace("/");
  }, [authLoading, currentUser, router]);

  if (authLoading) return null;
  if (!currentUser || currentUser.role !== "admin") return null;

  const reportedCount = posts.filter((p) => p.status === "reported").length;
  const memberCount = users.filter((u) => u.role !== "admin").length;

  const tabs = [
    { k: "pending",  label: "Pending",  icon: UserCheck, count: pendingUsers.length },
    { k: "reported", label: "Reported", icon: Flag,      count: reportedCount },
    { k: "members",  label: "Members",  icon: Users,     count: memberCount },
  ];

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-24 md:pb-12" style={{ backgroundColor: T.bg }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/")}>
            Back to feed
          </Button>

          <div className="mt-6 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} style={{ color: T.gold }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: T.gold }}>
                Administration
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl leading-tight font-serif" style={{ color: T.navy }}>
              Admin dashboard
            </h1>
          </div>

          {/* Tab bar */}
          <div
            className="flex p-1 rounded-xl mb-5 overflow-x-auto no-scrollbar"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap px-3"
                  style={{
                    backgroundColor: active ? T.card : "transparent",
                    color: active ? T.navy : T.textMuted,
                    boxShadow: active ? "0 1px 2px rgba(11,28,44,0.06)" : "none",
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                  <span
                    className="text-[11px] px-1.5 rounded-full tabular-nums"
                    style={{
                      backgroundColor: active ? T.goldBg : T.borderSoft,
                      color: active ? T.gold : T.textSubtle,
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="rounded-2xl border p-4 md:p-5"
            style={{ backgroundColor: T.card, borderColor: T.border }}
          >
            {tab === "pending"  && <PendingUsersList />}
            {tab === "reported" && <ReportedPostsList />}
            {tab === "members"  && <MembersList />}
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
