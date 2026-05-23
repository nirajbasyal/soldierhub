import Link from "next/link";
import { Loader2, UserMinus, UsersRound } from "lucide-react";
import { T } from "@/lib/theme";
import * as Follows from "@/lib/supabase/follows";
import Avatar from "@/components/ui/Avatar";

function getFollowProfileId(item = {}) {
  return Follows.getConnectionProfileId?.(item) || "";
}

function normalizeFollowProfile(row = {}) {
  const profileId = getFollowProfileId(row);
  const profile = row.profile || row.profiles || row.author || row.user || {};

  return {
    id: profileId,
    full_name: profile.full_name || row.full_name || "SoldierHub member",
    avatar_color: profile.avatar_color || row.avatar_color || "#314A66",
    avatar_url: profile.avatar_url || row.avatar_url || null,
    base: profile.base || row.base || "Fort Bliss",
  };
}

export default function ProfileFollowListPanel({
  type,
  items,
  loading,
  refreshing,
  error,
  onUnfollow,
  unfollowingId,
  totalCount = 0,
}) {
  const isFollowing = type === "following";
  const title = isFollowing ? "People you follow" : "People following you";
  const emptyBody = isFollowing
    ? "You are not following anyone yet. Search a member profile and tap Follow."
    : "No followers yet. As members follow your profile, they will appear here.";
  const safeItems = (items || []).filter((item) => Boolean(getFollowProfileId(item)));
  const safeTotalCount = Math.max(0, Number(totalCount) || 0);
  const hasMoreHidden = safeTotalCount > safeItems.length;

  return (
    <div
      className="mt-4 min-w-0 overflow-hidden rounded-3xl border p-3 sm:p-4"
      style={{ backgroundColor: "rgba(244,248,253,0.92)", borderColor: "#D5E2F2" }}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(220,232,247,0.96)", color: T.blue }}
          >
            <UsersRound size={17} />
          </div>
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 truncate text-sm font-black sm:text-base" style={{ color: T.navy }}>
              {title}
              {refreshing ? <Loader2 size={13} className="shrink-0 animate-spin" style={{ color: T.textSubtle }} /> : null}
            </h3>
            <p className="text-xs leading-5" style={{ color: T.textMuted }}>
              Only you can see this full list on your profile.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-3" style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2" }}>
              <div className="h-[42px] w-[42px] shrink-0 animate-pulse rounded-full bg-[#DDE6EF]" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-36 max-w-full animate-pulse rounded-full bg-[#DDE6EF]" />
                <div className="mt-2 h-3 w-24 max-w-full animate-pulse rounded-full bg-[#E8EEF5]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border px-3 py-3 text-sm" style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}>
          {error}
        </div>
      ) : safeItems.length === 0 ? (
        <div className="rounded-2xl border px-3 py-3 text-sm" style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2", color: T.textMuted }}>
          {emptyBody}
        </div>
      ) : (
        <div className="grid min-w-0 gap-2">
          {safeItems.map((item) => {
            const profile = normalizeFollowProfile(item);
            const profileHref = `/profile/${profile.id}?name=${encodeURIComponent(profile.full_name)}`;

            return (
              <div
                key={profile.id || item.created_at || profile.full_name}
                className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border px-2.5 py-3 sm:gap-3 sm:px-3"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2" }}
              >
                <div className="shrink-0">
                  <Avatar name={profile.full_name} color={profile.avatar_color} src={profile.avatar_url} size={42} />
                </div>

                <Link href={profileHref} className="min-w-0 text-left">
                  <div className="truncate text-sm font-black leading-5" style={{ color: T.navy }}>
                    {profile.full_name}
                  </div>
                  <div className="truncate text-xs leading-5" style={{ color: T.textMuted }}>
                    {profile.base}
                  </div>
                </Link>

                {isFollowing && profile.id ? (
                  <button
                    type="button"
                    onClick={() => onUnfollow(profile.id)}
                    disabled={unfollowingId === profile.id}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition hover:-translate-y-0.5 disabled:opacity-60 min-[390px]:px-3"
                    style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
                    aria-label={`Unfollow ${profile.full_name}`}
                  >
                    {unfollowingId === profile.id ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                    <span className="hidden min-[390px]:inline">Unfollow</span>
                  </button>
                ) : null}
              </div>
            );
          })}

          {hasMoreHidden ? (
            <div
              className="rounded-2xl border px-3 py-2 text-center text-xs font-semibold"
              style={{ backgroundColor: "rgba(255,255,255,0.82)", borderColor: "#D5E2F2", color: T.textMuted }}
            >
              Showing first {safeItems.length} of {safeTotalCount}. More loading can be added later if needed.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export { getFollowProfileId };
