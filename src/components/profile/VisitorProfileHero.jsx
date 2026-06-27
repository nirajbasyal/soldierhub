"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserPlus, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import ShareProfileButton from "@/components/profile/ShareProfileButton";
import ProfileVerifiedBadge from "@/components/profile/ProfileVerifiedBadge";

function limitBio(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return text.length > 150 ? `${text.slice(0, 150).trim()}…` : text;
}

function StatItem({ label, value }) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-sm font-black leading-none tabular-nums min-[380px]:text-base text-[#0B1C2C]">
        {value}
      </div>
      <div className="mt-1 truncate text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-500 min-[420px]:text-[10px] min-[420px]:tracking-[0.11em]">
        {label}
      </div>
    </div>
  );
}

export default function VisitorProfileHero({
  profile,
  postCount,
  followersCount,
  followingCount,
  followLoading,
  isFollowing,
  canFollow,
  refreshing,
  profileId,
  pushToast,
  onFollowToggle,
}) {
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  useEffect(() => {
    if (!avatarViewerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAvatarViewerOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [avatarViewerOpen]);

  if (!profile) return null;

  const bioText = limitBio(profile.bio);
  const profileName = profile.full_name || "SoldierHub member";
  const avatarLabel = `View ${profileName}'s profile picture`;

  return (
    <>
      <section className="relative min-w-0 overflow-hidden rounded-[28px] border border-[#D5E2F2] bg-white shadow-[0_18px_42px_rgba(7,27,51,0.11)]">
        <div
          className="relative min-h-[170px] overflow-hidden px-4 pb-12 pt-5 min-[560px]:min-h-[164px] min-[560px]:px-6 min-[560px]:pb-12 min-[560px]:pt-6"
          style={{
            background:
              "radial-gradient(circle at 88% 43%, rgba(255,255,255,0.13), transparent 22%), radial-gradient(circle at 88% 43%, transparent 0 16%, rgba(255,255,255,0.15) 16.3% 16.9%, transparent 17.2% 100%), linear-gradient(135deg, #071B33 0%, #102E52 100%)",
          }}
        >
          <div className="relative z-10 flex min-w-0 items-start gap-3.5 min-[560px]:gap-4">
            <button
              type="button"
              onClick={() => setAvatarViewerOpen(true)}
              aria-label={avatarLabel}
              title="Click to view profile picture"
              className="group relative shrink-0 rounded-full shadow-[0_12px_28px_rgba(0,0,0,0.24)] outline-none ring-offset-2 ring-offset-[#071B33] transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white"
            >
              <Avatar name={profileName} color={profile.avatar_color} src={profile.avatar_url} size={76} />
              <span className="pointer-events-none absolute inset-0 rounded-full bg-black/0 transition group-hover:bg-black/10" />
              <span className="sr-only">Open profile picture viewer</span>
            </button>

            <div className="min-w-0 flex-1 pt-1 text-left">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h1 className="flex min-w-0 items-start gap-1.5 text-2xl font-black tracking-[-0.04em] leading-tight text-white sm:text-3xl" title={profileName}>
                  <span className="min-w-0 truncate">{profileName}</span>
                  <ProfileVerifiedBadge className="mt-1 sm:mt-1.5" />
                </h1>
                {refreshing ? <Loader2 size={15} className="mt-1 shrink-0 animate-spin text-white/80" /> : null}
              </div>

              {bioText ? (
                <p className="mt-1.5 line-clamp-3 max-w-xl break-words text-sm leading-6 text-white">
                  {bioText}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-3 -mt-7 grid grid-cols-3 overflow-hidden rounded-3xl border border-[#D5E2F2] bg-white shadow-[0_14px_30px_rgba(7,27,51,0.13)] sm:mx-5">
          <div className="px-1.5 py-3">
            <StatItem label="Posts" value={postCount} />
          </div>
          <div className="border-l border-[#E4EDF7] px-1.5 py-3">
            <StatItem label="Followers" value={followLoading && !followersCount ? "…" : followersCount || 0} />
          </div>
          <div className="border-l border-[#E4EDF7] px-1.5 py-3">
            <StatItem label="Following" value={followLoading && !followingCount ? "…" : followingCount || 0} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 px-4 pb-5 pt-4 min-[420px]:grid-cols-2 sm:px-5">
          <button
            type="button"
            onClick={onFollowToggle}
            disabled={followLoading || !canFollow}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: isFollowing ? "rgba(220,232,247,0.96)" : "#0B1C2C",
              borderColor: isFollowing ? "#BCD0EA" : "rgba(7,27,51,0.18)",
              color: isFollowing ? "#1E4E8C" : "#FFFFFF",
            }}
          >
            {followLoading ? <Loader2 size={16} className="animate-spin" /> : isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {isFollowing ? "Following" : "Follow"}
          </button>

          <ShareProfileButton profileId={profileId} profileName={profileName} pushToast={pushToast} />
        </div>
      </section>

      {avatarViewerOpen && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${profileName}'s profile picture`}
          onClick={() => setAvatarViewerOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-[520px] flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAvatarViewerOpen(false)}
              className="absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close profile picture viewer"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <div className="mt-12 flex max-h-[72vh] w-full items-center justify-center rounded-[32px] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur sm:mt-6 sm:p-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profileName}'s profile picture`}
                  className="max-h-[68vh] w-auto max-w-full rounded-[26px] object-contain shadow-2xl"
                />
              ) : (
                <Avatar name={profileName} color={profile.avatar_color} size={220} />
              )}
            </div>

            <div className="max-w-full rounded-full bg-white/10 px-4 py-2 text-center text-sm font-bold text-white shadow-lg backdrop-blur">
              {profileName}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
