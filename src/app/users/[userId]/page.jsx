"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, ShieldCheck, UserRound } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import VisitorPostList from "@/components/profile/VisitorPostList";
import { getPublicProfile, listPublicPostsByAuthor } from "@/lib/db/visitorProfiles";

function VisitorStatusCard({ icon: Icon, title, body, action }) {
  return (
    <AppShell hideNav>
      <main className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-12" style={{ background: "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)" }}>
        <div className="w-full max-w-md rounded-[28px] border p-6 text-center" style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 18px 44px rgba(7,27,51,0.08)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}>
            <Icon size={24} />
          </div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: T.navy }}>{title}</h1>
          <p className="text-sm leading-7 mb-5" style={{ color: T.textMuted }}>{body}</p>
          {action}
        </div>
      </main>
    </AppShell>
  );
}

function formatJoinDate(value) {
  if (!value) return "Member";
  try {
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "Member";
  }
}

export default function VisitorProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId;
  const { currentUser, authLoading } = useApp();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVisitorProfile() {
      if (!userId) return;

      setLoading(true);
      setNotFound(false);

      const profileResult = await getPublicProfile(userId);

      if (cancelled) return;

      if (profileResult.error || !profileResult.data) {
        setProfile(null);
        setPosts([]);
        setNotFound(true);
        setLoading(false);
        return;
      }

      const postsResult = await listPublicPostsByAuthor(userId);

      if (cancelled) return;

      setProfile(profileResult.data);
      setPosts(postsResult.data || []);
      setLoading(false);
    }

    loadVisitorProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (currentUser?.id && userId && currentUser.id === userId) {
      router.replace("/profile");
    }
  }, [authLoading, currentUser?.id, router, userId]);

  const totals = useMemo(() => {
    return posts.reduce(
      (acc, post) => ({
        upvotes: acc.upvotes + (post.upvote_count || 0),
        replies: acc.replies + (post.comment_count || 0),
      }),
      { upvotes: 0, replies: 0 }
    );
  }, [posts]);

  if (loading || authLoading) {
    return <VisitorStatusCard icon={UserRound} title="Loading profile" body="Getting this member profile ready." />;
  }

  if (notFound || !profile) {
    return (
      <VisitorStatusCard
        icon={UserRound}
        title="Profile not available"
        body="This profile may be private, unverified, deleted, or unavailable. Anonymous author profiles are not shown."
        action={<Button variant="primary" onClick={() => router.push("/")}>Back to feed</Button>}
      />
    );
  }

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-24 md:pb-12" style={{ background: "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5" style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: "#D5E2F2", color: T.navy }}>
            <ArrowLeft size={16} />
            Back to feed
          </Link>

          <section className="mt-6 rounded-[32px] border overflow-hidden relative" style={{ borderColor: "#BCD0EA", background: "linear-gradient(135deg, rgba(220,232,247,0.96) 0%, rgba(253,254,255,0.98) 52%, rgba(253,236,240,0.9) 100%)", boxShadow: "0 22px 60px rgba(7,27,51,0.08)" }}>
            <div className="absolute left-0 top-0 h-full w-2 bg-[#B31942]" />
            <div className="absolute right-0 top-0 h-full w-2 bg-[#1E4E8C]" />

            <div className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
                <div className="flex flex-col md:flex-row gap-5 md:items-start min-w-0">
                  <div className="rounded-[28px] p-2 border shrink-0 mx-auto md:mx-0" style={{ backgroundColor: "rgba(255,255,255,0.65)", borderColor: "#D5E2F2" }}>
                    <Avatar name={profile.full_name} color={profile.avatar_color} src={profile.avatar_url} size={92} />
                  </div>

                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}>
                      <UserRound size={14} />
                      Member Profile
                    </div>

                    <div className="mt-4 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                      <h1 className="text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>{profile.full_name || "SoldierHub member"}</h1>
                      <Badge tone="blue" icon={ShieldCheck}>Verified</Badge>
                    </div>

                    <div className="mt-3 max-w-xl mx-auto md:mx-0">
                      {profile.bio ? (
                        <p className="text-[15px] md:text-base leading-7" style={{ color: T.text }}>{profile.bio}</p>
                      ) : (
                        <p className="text-[15px] md:text-base leading-7" style={{ color: T.textMuted }}>This member has not added a bio yet.</p>
                      )}
                    </div>

                    <div className="mt-4 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto md:mx-0">
                      <div className="rounded-2xl border px-3 py-2 flex items-start gap-2 min-w-0" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                        <CalendarDays size={15} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Joined</div>
                          <div className="text-sm font-semibold" style={{ color: T.navy }}>{formatJoinDate(profile.created_at)}</div>
                        </div>
                      </div>
                      <div className="rounded-2xl border px-3 py-2 flex items-start gap-2 min-w-0" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                        <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>Status</div>
                          <div className="text-sm font-semibold" style={{ color: T.navy }}>Verified community member</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:min-w-[150px]">
                  {[["Posts", posts.length], ["Upvotes", totals.upvotes], ["Replies", totals.replies]].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border p-3 text-center lg:text-left" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}>
                      <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>{value}</div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <VisitorPostList posts={posts} profileName={profile.full_name || "this member"} />
          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
