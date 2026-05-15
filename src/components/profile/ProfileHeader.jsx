"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  UserMinus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import * as Auth from "@/lib/supabase/auth";
import * as Follows from "@/lib/supabase/follows";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import ShareProfileButton from "@/components/profile/ShareProfileButton";

const COLOR_OPTIONS = [
  "#0B1C2C",
  "#1E4E8C",
  "#314A66",
  "#B31942",
  "#5B3F8C",
  "#9C2A55",
  "#1F5A87",
  "#1F6E66",
  "#7A5C20",
];

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div
      className="rounded-2xl border px-3 py-2.5 flex items-center gap-2.5 min-w-0"
      style={{ backgroundColor: "rgba(255,255,255,0.92)", borderColor: "#D5E2F2" }}
    >
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(220,232,247,0.82)", color: T.blue }}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0 text-left">
        <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
          {label}
        </div>
        <div className="text-xs md:text-sm font-semibold truncate" style={{ color: T.navy }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, onClick, active = false }) {
  const content = (
    <>
      <div className="text-xl md:text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>
        {value}
      </div>
      <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
        {label}
      </div>
    </>
  );

  const sharedClass = "rounded-2xl border px-2 py-2.5 md:p-3 text-center lg:text-left transition";
  const sharedStyle = {
    backgroundColor: active ? "rgba(220,232,247,0.98)" : "rgba(244,248,253,0.9)",
    borderColor: active ? "#9DB9DA" : "#D5E2F2",
  };

  if (!onClick) {
    return (
      <div className={sharedClass} style={sharedStyle}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sharedClass} hover:-translate-y-0.5 hover:shadow-sm`}
      style={sharedStyle}
    >
      {content}
    </button>
  );
}

function normalizeFollowProfile(row = {}) {
  return {
    id: row.id || null,
    full_name: row.full_name || "SoldierHub member",
    avatar_color: row.avatar_color || "#314A66",
    avatar_url: row.avatar_url || null,
    base: row.base || "Fort Bliss",
  };
}

function FollowListPanel({ type, items, loading, refreshing, error, onUnfollow, unfollowingId }) {
  const isFollowing = type === "following";
  const title = isFollowing ? "People you follow" : "People following you";
  const emptyBody = isFollowing
    ? "You are not following anyone yet. Search a member profile and tap Follow."
    : "No followers yet. As members follow your profile, they will appear here.";

  return (
    <div
      className="mt-4 rounded-3xl border p-3 md:p-4"
      style={{ backgroundColor: "rgba(244,248,253,0.92)", borderColor: "#D5E2F2" }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(220,232,247,0.96)", color: T.blue }}
          >
            <UsersRound size={17} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
              {title}
              {refreshing ? <Loader2 size={13} className="animate-spin" style={{ color: T.textSubtle }} /> : null}
            </h3>
            <p className="text-xs" style={{ color: T.textMuted }}>
              Only you can see this full list on your profile.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border px-3 py-3 flex items-center gap-3" style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2" }}>
              <div className="h-[42px] w-[42px] rounded-full animate-pulse bg-[#DDE6EF]" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-36 animate-pulse rounded-full bg-[#DDE6EF]" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-[#E8EEF5]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border px-3 py-3 text-sm" style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border px-3 py-3 text-sm" style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2", color: T.textMuted }}>
          {emptyBody}
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => {
            const profile = normalizeFollowProfile(item.profile || item);
            const profileHref = profile.id
              ? `/profile/${profile.id}?name=${encodeURIComponent(profile.full_name)}`
              : "#";

            return (
              <div
                key={profile.id || item.created_at || profile.full_name}
                className="rounded-2xl border px-3 py-3 flex items-center gap-3"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2" }}
              >
                <Avatar name={profile.full_name} color={profile.avatar_color} src={profile.avatar_url} size={42} />

                <Link href={profileHref} className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-extrabold truncate" style={{ color: T.navy }}>
                    {profile.full_name}
                  </div>
                  <div className="text-xs truncate" style={{ color: T.textMuted }}>
                    {profile.base}
                  </div>
                </Link>

                {isFollowing && profile.id && (
                  <button
                    type="button"
                    onClick={() => onUnfollow(profile.id)}
                    disabled={unfollowingId === profile.id}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 disabled:opacity-60"
                    style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
                  >
                    {unfollowingId === profile.id ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                    Unfollow
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function postBelongsToCurrentUser(post, user) {
  if (!post || !user?.id) return false;

  return (
    post.author_id === user.id ||
    post.user_id === user.id ||
    post.profile_id === user.id ||
    post.viewer_is_author === true
  );
}

export default function ProfileHeader() {
  const app = useApp() || {};
  const {
    currentUser,
    updateProfile,
    posts = [],
    myPosts = [],
    pushToast,
  } = app;

  const safeUser = currentUser || {};
  const displayName = safeUser.full_name || safeUser.email || "SoldierHub user";
  const displayEmail = safeUser.email || safeUser.personal_email || "Verified email";
  const displayBio = safeUser.bio || "";
  const displayColor = safeUser.avatar_color || "#1E4E8C";
  const userStatus = safeUser.status || safeUser.verification_status || "pending";
  const isVerified = userStatus === "verified";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(displayBio);
  const [color, setColor] = useState(displayColor);

  const [followSummary, setFollowSummary] = useState({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [followLoading, setFollowLoading] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState(null);
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsRefreshing, setConnectionsRefreshing] = useState(false);
  const [connectionsError, setConnectionsError] = useState("");
  const [unfollowingId, setUnfollowingId] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.full_name || currentUser.email || "SoldierHub user");
    setBio(currentUser.bio || "");
    setColor(currentUser.avatar_color || "#1E4E8C");
  }, [currentUser]);

  const loadFollowSummary = useCallback(
    async ({ silent = false, skipCache = false } = {}) => {
      if (!currentUser?.id) return;

      if (!silent) {
        const cachedSummary = Follows.getCachedFollowSummary?.(currentUser.id, currentUser.id);
        if (cachedSummary) {
          setFollowSummary(cachedSummary);
        } else {
          setFollowLoading(true);
        }
      }

      const { data, error } = await Follows.getFollowSummary(currentUser.id, currentUser.id, {
        skipCache,
      });

      if (!silent) setFollowLoading(false);

      if (error) {
        if (!silent) setFollowSummary({ followersCount: 0, followingCount: 0, isFollowing: false });
        return;
      }

      setFollowSummary(data);
    },
    [currentUser?.id]
  );

  useEffect(() => {
    loadFollowSummary();
  }, [loadFollowSummary]);

  const visiblePosts = useMemo(() => {
    if (!currentUser?.id) return [];
    if (myPosts.length > 0) return myPosts;
    return posts.filter((post) => postBelongsToCurrentUser(post, currentUser));
  }, [currentUser, myPosts, posts]);

  const openConnections = useCallback(
    async (type) => {
      if (!currentUser?.id) return;

      if (connectionsTab === type) {
        setConnectionsTab(null);
        setConnections([]);
        setConnectionsError("");
        setConnectionsRefreshing(false);
        return;
      }

      setConnectionsTab(type);
      setConnectionsError("");

      const cachedConnections = Follows.getCachedFollowConnections?.(type, currentUser.id);
      if (cachedConnections) {
        setConnections(cachedConnections);
        setConnectionsLoading(false);
        setConnectionsRefreshing(true);
      } else {
        setConnections([]);
        setConnectionsLoading(true);
        setConnectionsRefreshing(false);
      }

      const { data, error } = await Follows.listFollowConnections(type, currentUser.id, {
        limit: 100,
        skipCache: true,
      });

      setConnectionsLoading(false);
      setConnectionsRefreshing(false);

      if (error) {
        setConnectionsError(error.message || "Could not load this list.");
        return;
      }

      setConnections(data || []);
    },
    [connectionsTab, currentUser?.id]
  );

  const handleUnfollowFromList = useCallback(
    async (targetProfileId) => {
      if (!targetProfileId || unfollowingId || !currentUser?.id) return;

      const previousConnections = connections;
      const previousSummary = followSummary;

      setUnfollowingId(targetProfileId);
      setConnections((items) =>
        items.filter((item) => (item.profile?.id || item.id) !== targetProfileId)
      );
      setFollowSummary((prev) => {
        const next = {
          ...prev,
          followingCount: Math.max(0, (prev.followingCount || 0) - 1),
        };
        Follows.cacheFollowSummary?.(currentUser.id, currentUser.id, next);
        return next;
      });
      Follows.removeProfileFromCachedFollowing?.(currentUser.id, targetProfileId);

      const { error } = await Follows.unfollowUser(targetProfileId);
      setUnfollowingId("");

      if (error) {
        setConnections(previousConnections);
        setFollowSummary(previousSummary);
        Follows.cacheFollowSummary?.(currentUser.id, currentUser.id, previousSummary);
        pushToast?.(error.message || "Could not unfollow this member.", "error");
        return;
      }

      pushToast?.("Member unfollowed.", "success");
      loadFollowSummary({ silent: true, skipCache: true });
    },
    [connections, currentUser?.id, followSummary, loadFollowSummary, pushToast, unfollowingId]
  );

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const save = () => {
    if (!currentUser?.id) return;
    updateProfile?.({ full_name: name.trim() || displayName, bio, avatar_color: color });
    setEditing(false);
  };

  const cancel = () => {
    setName(displayName);
    setBio(displayBio);
    setColor(displayColor);
    resetPasswordForm();
    setShowPasswordForm(false);
    setEditing(false);
  };

  const openPasswordForm = () => {
    resetPasswordForm();
    setShowPasswordForm(true);
  };

  const closePasswordForm = () => {
    resetPasswordForm();
    setShowPasswordForm(false);
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!displayEmail || displayEmail === "Verified email") {
      setPasswordError("Could not find your verified email. Please refresh and try again.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Enter your current password, new password, and confirmation password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setPasswordSaving(true);

    const verify = await Auth.signIn({ email: displayEmail, password: currentPassword });

    if (verify.error) {
      setPasswordSaving(false);
      setPasswordError("Current password is incorrect. Please try again.");
      return;
    }

    const result = await Auth.updatePassword(newPassword);

    setPasswordSaving(false);

    if (result.error) {
      setPasswordError(result.error.message || "Could not update password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Password updated successfully.");
  };

  const followerValue = followLoading ? "…" : followSummary.followersCount || 0;
  const followingValue = followLoading ? "…" : followSummary.followingCount || 0;

  return (
    <section
      className="rounded-[24px] md:rounded-[30px] border relative"
      style={{
        borderColor: "#D5E2F2",
        backgroundColor: "rgba(255,255,255,0.92)",
        boxShadow: "0 14px 38px rgba(7,27,51,0.07)",
      }}
    >
      <div
        className="absolute left-5 right-5 top-0 h-1 rounded-b-full"
        style={{ backgroundColor: "rgba(30,78,140,0.72)" }}
      />

      <div className="px-4 py-5 md:p-7">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:items-start lg:justify-between">
          <div className="flex flex-col md:flex-row gap-3 md:gap-5 md:items-start min-w-0">
            <div className="flex flex-col items-center md:items-start gap-2 md:gap-3 shrink-0">
              <div
                className="rounded-[22px] md:rounded-[26px] p-1.5 md:p-2 border"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#D5E2F2" }}
              >
                <div className="md:hidden">
                  <Avatar name={editing ? name : displayName} color={editing ? color : displayColor} size={64} />
                </div>
                <div className="hidden md:block">
                  <Avatar name={editing ? name : displayName} color={editing ? color : displayColor} size={88} />
                </div>
              </div>

              {editing && (
                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start max-w-[180px]">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: c === color ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                        boxShadow: c === color ? "0 0 0 2px #1E4E8C" : "none",
                      }}
                      aria-label={`Choose profile color ${c}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              {!editing ? (
                <>
                  <div
                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.12em]"
                    style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.blue }}
                  >
                    <UserRound size={13} />
                    My Profile
                  </div>

                  <div className="mt-3 md:mt-4 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>
                      {displayName}
                    </h1>

                    {safeUser.role === "admin" && (
                      <Badge tone="amber" icon={Shield}>
                        Admin
                      </Badge>
                    )}

                    {isVerified && (
                      <Badge tone="blue" icon={ShieldCheck}>
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2 md:mt-3 max-w-xl mx-auto md:mx-0">
                    {displayBio ? (
                      <p className="text-sm md:text-base leading-6 md:leading-7" style={{ color: T.text }}>
                        {displayBio}
                      </p>
                    ) : (
                      <p className="text-sm md:text-base leading-6 md:leading-7" style={{ color: T.textMuted }}>
                        Add a short bio so other verified community members know who you are.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 md:mt-4 max-w-xl mx-auto md:mx-0">
                    <InfoPill icon={Mail} label="Email" value={displayEmail} />
                  </div>
                </>
              ) : (
                <div
                  className="rounded-3xl border p-4 md:p-5 text-left"
                  style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#D5E2F2" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold" style={{ color: T.navy }}>
                        Edit profile
                      </h2>
                      <p className="text-sm mt-1" style={{ color: T.textMuted }}>
                        Update your display name, bio, and avatar color.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={cancel}
                      className="h-9 w-9 rounded-full border flex items-center justify-center shrink-0"
                      style={{ backgroundColor: T.card, borderColor: "#D5E2F2", color: T.textMuted }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <TextInput label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
                    <TextArea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                    <div className="rounded-2xl border px-3 py-2 text-xs" style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.textSubtle }}>
                      Verified email: {displayEmail} · email cannot be changed after verification.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="primary" onClick={save} icon={Check}>
                      Save profile changes
                    </Button>
                    <Button variant="ghost" onClick={cancel}>
                      Cancel
                    </Button>
                  </div>

                  {!showPasswordForm ? (
                    <button
                      type="button"
                      onClick={openPasswordForm}
                      className="mt-4 inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-bold transition hover:translate-x-0.5"
                      style={{ color: "#B31942" }}
                    >
                      <KeyRound size={15} />
                      Change current password
                    </button>
                  ) : (
                    <div
                      className="mt-4 rounded-3xl border p-4"
                      style={{
                        backgroundColor: "rgba(244,248,253,0.95)",
                        borderColor: "#D5E2F2",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
                          >
                            <KeyRound size={18} />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold" style={{ color: T.navy }}>
                              Change password
                            </h3>
                            <p className="text-xs leading-5 mt-0.5" style={{ color: T.textMuted }}>
                              Enter your current password first, then choose a new password.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={closePasswordForm}
                          className="h-8 w-8 rounded-full border flex items-center justify-center shrink-0"
                          style={{ backgroundColor: T.card, borderColor: "#D5E2F2", color: T.textMuted }}
                          aria-label="Close password form"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid gap-3">
                        <TextInput label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                        <TextInput label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                        <TextInput label="Confirm new password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                      </div>

                      {passwordError && (
                        <div
                          className="text-xs px-3 py-2 rounded-2xl flex items-start gap-2 mt-3 border"
                          style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
                        >
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          {passwordError}
                        </div>
                      )}

                      {passwordSuccess && (
                        <div
                          className="text-xs px-3 py-2 rounded-2xl flex items-start gap-2 mt-3 border"
                          style={{ backgroundColor: "rgba(220,232,247,0.95)", borderColor: "#BCD0EA", color: T.blue }}
                        >
                          <Check size={14} className="shrink-0 mt-0.5" />
                          {passwordSuccess}
                        </div>
                      )}

                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={changePassword} icon={KeyRound} disabled={passwordSaving}>
                          {passwordSaving ? "Updating password…" : "Update password"}
                        </Button>
                        <Button variant="ghost" onClick={closePasswordForm}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editing && (
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:min-w-[150px]">
              <StatCard label="Posts" value={visiblePosts.length} />
              <StatCard
                label="Followers"
                value={followerValue}
                onClick={() => openConnections("followers")}
                active={connectionsTab === "followers"}
              />
              <StatCard
                label="Following"
                value={followingValue}
                onClick={() => openConnections("following")}
                active={connectionsTab === "following"}
              />
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-4 md:mt-5 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 w-full sm:w-auto"
              style={{ backgroundColor: T.navy, borderColor: "rgba(7,27,51,0.18)", color: "#FFFFFF" }}
            >
              <Edit3 size={16} />
              Edit profile
            </button>

            <ShareProfileButton
              profileId={currentUser?.id}
              profileName={displayName}
              pushToast={pushToast}
              className="w-full sm:w-auto"
            />
          </div>
        )}

        {!editing && connectionsTab && (
          <FollowListPanel
            type={connectionsTab}
            items={connections}
            loading={connectionsLoading}
            refreshing={connectionsRefreshing}
            error={connectionsError}
            onUnfollow={handleUnfollowFromList}
            unfollowingId={unfollowingId}
          />
        )}
      </div>
    </section>
  );
}
