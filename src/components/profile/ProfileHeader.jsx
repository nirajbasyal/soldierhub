"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  KeyRound,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import * as Auth from "@/lib/supabase/auth";
import * as Follows from "@/lib/supabase/follows";
import { compressAvatarImage, revokePreviewUrl } from "@/lib/media/imageCompression";
import { formatBytes, uploadCompressedImageToR2 } from "@/lib/media/upload";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import ProfileIdentityHero from "@/components/profile/ProfileIdentityHero";
import ProfileActions from "@/components/profile/ProfileActions";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileInfoPill from "@/components/profile/ProfileInfoPill";
import ProfileAvatarActions from "@/components/profile/ProfileAvatarActions";
import ProfileColorPicker from "@/components/profile/ProfileColorPicker";
import ProfileFollowListPanel, { getFollowProfileId } from "@/components/profile/ProfileFollowListPanel";

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

const FOLLOW_LIST_PREVIEW_LIMIT = 30;

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
  const avatarInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(safeUser.avatar_url || "");
  const [avatarImage, setAvatarImage] = useState(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

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
    setAvatarUrl(currentUser.avatar_url || "");
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (avatarImage?.previewUrl) revokePreviewUrl(avatarImage.previewUrl);
    };
  }, [avatarImage]);

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

      const expectedCount =
        type === "following"
          ? Number(followSummary.followingCount) || 0
          : Number(followSummary.followersCount) || 0;

      setConnectionsTab(type);
      setConnectionsError("");

      if (expectedCount === 0) {
        setConnections([]);
        setConnectionsLoading(false);
        setConnectionsRefreshing(false);
        return;
      }

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
        limit: FOLLOW_LIST_PREVIEW_LIMIT,
        skipCache: Boolean(cachedConnections),
      });

      setConnectionsLoading(false);
      setConnectionsRefreshing(false);

      if (error) {
        setConnectionsError(error.message || "Could not load this list.");
        return;
      }

      setConnections(data || []);
    },
    [connectionsTab, currentUser?.id, followSummary.followersCount, followSummary.followingCount]
  );

  const handleUnfollowFromList = useCallback(
    async (targetProfileId) => {
      if (unfollowingId || !currentUser?.id) return;

      if (!Follows.isValidProfileId?.(targetProfileId)) {
        Follows.clearCachedFollowConnections?.("following", currentUser.id);
        setConnections((items) => items.filter((item) => Boolean(getFollowProfileId(item))));
        setConnectionsError("This follow list had an old cached profile. Please tap Following again to refresh.");
        return;
      }

      const previousConnections = connections;
      const previousSummary = followSummary;

      setUnfollowingId(targetProfileId);
      setConnections((items) =>
        items.filter((item) => getFollowProfileId(item) !== targetProfileId)
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

  const activeAvatarSrc = avatarImage?.previewUrl || avatarUrl || "";

  const chooseAvatar = () => {
    if (avatarSaving) return;
    setAvatarError("");
    avatarInputRef.current?.click();
  };

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setAvatarError("");

    try {
      const compressed = await compressAvatarImage(file);

      setAvatarImage((previous) => {
        if (previous?.previewUrl) revokePreviewUrl(previous.previewUrl);
        return compressed;
      });
    } catch (error) {
      setAvatarError(error?.message || "Could not prepare this profile photo.");
    }
  };

  const removeAvatarPhoto = () => {
    if (avatarSaving) return;
    setAvatarError("");
    setAvatarUrl("");
    setAvatarImage((previous) => {
      if (previous?.previewUrl) revokePreviewUrl(previous.previewUrl);
      return null;
    });
  };

  const save = async () => {
    if (!currentUser?.id || avatarSaving) return;

    setAvatarError("");
    setAvatarSaving(true);

    try {
      let nextAvatarUrl = avatarUrl || "";

      if (avatarImage?.file) {
        const uploaded = await uploadCompressedImageToR2(avatarImage, {
          purpose: "avatar",
        });

        nextAvatarUrl = uploaded?.url || "";
      }

      const result = await updateProfile?.({
        full_name: name.trim() || displayName,
        bio,
        avatar_color: color,
        avatar_url: nextAvatarUrl || null,
      });

      if (result?.ok === false) {
        setAvatarError(result.error || "Could not save profile photo.");
        return;
      }

      setAvatarUrl(nextAvatarUrl);
      setAvatarImage((previous) => {
        if (previous?.previewUrl) revokePreviewUrl(previous.previewUrl);
        return null;
      });
      setEditing(false);
    } catch (error) {
      setAvatarError(error?.message || "Could not upload profile photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const cancel = () => {
    if (avatarSaving) return;
    setName(displayName);
    setBio(displayBio);
    setColor(displayColor);
    setAvatarUrl(safeUser.avatar_url || "");
    setAvatarError("");
    setAvatarImage((previous) => {
      if (previous?.previewUrl) revokePreviewUrl(previous.previewUrl);
      return null;
    });
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

  const followerValue = followSummary.followersCount || 0;
  const followingValue = followSummary.followingCount || 0;
  const activeConnectionsTotal =
    connectionsTab === "following" ? followingValue : connectionsTab === "followers" ? followerValue : 0;

  return (
    <section
      className="relative min-w-0 overflow-hidden rounded-[28px] border"
      style={{
        borderColor: "#D5E2F2",
        backgroundColor: "rgba(255,255,255,0.96)",
        boxShadow: "0 18px 42px rgba(7,27,51,0.11)",
      }}
    >
      {!editing ? (
        <div className="min-w-0 pb-5">
          <ProfileIdentityHero
            displayName={displayName}
            displayBio={displayBio}
            displayColor={displayColor}
            avatarUrl={safeUser.avatar_url}
            isVerified={isVerified}
            isAdmin={safeUser.role === "admin"}
          />

          <ProfileStats
            postsCount={visiblePosts.length}
            followersCount={followerValue}
            followingCount={followingValue}
            loading={followLoading}
            activeTab={connectionsTab}
            onOpenFollowers={() => openConnections("followers")}
            onOpenFollowing={() => openConnections("following")}
          />

          <div className="mx-4 mt-4 sm:mx-5">
            <ProfileInfoPill icon={Mail} label="Email" value={displayEmail} />
          </div>

          <ProfileActions
            onEdit={() => setEditing(true)}
            profileId={currentUser?.id}
            profileName={displayName}
            pushToast={pushToast}
          />

          <div className="mx-4 sm:mx-5">
            {connectionsTab ? (
              <ProfileFollowListPanel
                type={connectionsTab}
                items={connections}
                loading={connectionsLoading}
                refreshing={connectionsRefreshing}
                error={connectionsError}
                onUnfollow={handleUnfollowFromList}
                unfollowingId={unfollowingId}
                totalCount={activeConnectionsTotal}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-full border-2 border-white shadow-[0_10px_22px_rgba(7,27,51,0.12)]">
                <Avatar name={name} color={color} src={activeAvatarSrc} size={72} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-[-0.02em]" style={{ color: T.navy }}>
                  Edit profile
                </h2>
                <p className="mt-0.5 text-xs leading-5" style={{ color: T.textMuted }}>
                  Update your display name, bio, and profile photo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cancel}
              disabled={avatarSaving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: T.card, borderColor: "#D5E2F2", color: T.textMuted }}
              aria-label="Close edit profile"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFile}
              className="hidden"
            />

            <ProfileAvatarActions
              hasAvatar={Boolean(activeAvatarSrc)}
              saving={avatarSaving}
              onChoose={chooseAvatar}
              onRemove={removeAvatarPhoto}
            />

            {avatarImage?.size ? (
              <div
                className="rounded-2xl border px-3 py-2 text-center text-[11px] font-semibold"
                style={{ backgroundColor: "rgba(220,232,247,0.55)", borderColor: "#D5E2F2", color: T.textMuted }}
              >
                Ready to upload · {formatBytes(avatarImage.size)}
              </div>
            ) : null}

            {avatarError ? (
              <div
                className="rounded-2xl border px-3 py-2 text-center text-[11px] font-semibold"
                style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
              >
                {avatarError}
              </div>
            ) : null}

            <ProfileColorPicker colors={COLOR_OPTIONS} value={color} onChange={setColor} />

            <TextInput label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextArea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />

            <div className="rounded-2xl border px-3 py-2 text-xs" style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.textSubtle }}>
              Verified email: {displayEmail} · email cannot be changed after verification.
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Button
              variant="primary"
              onClick={save}
              icon={avatarSaving ? Loader2 : Check}
              disabled={avatarSaving}
            >
              {avatarSaving ? "Saving…" : "Save profile"}
            </Button>
            <Button variant="ghost" onClick={cancel} disabled={avatarSaving}>
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
            <div className="mt-4 rounded-3xl border p-4" style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2" }}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}>
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black" style={{ color: T.navy }}>
                      Change password
                    </h3>
                    <p className="mt-0.5 text-xs leading-5" style={{ color: T.textMuted }}>
                      Enter your current password first, then choose a new password.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closePasswordForm}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
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

              {passwordError ? (
                <div
                  className="mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs"
                  style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {passwordError}
                </div>
              ) : null}

              {passwordSuccess ? (
                <div
                  className="mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs"
                  style={{ backgroundColor: "rgba(220,232,247,0.95)", borderColor: "#BCD0EA", color: T.blue }}
                >
                  <Check size={14} className="mt-0.5 shrink-0" />
                  {passwordSuccess}
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <Button variant="ghost" onClick={changePassword} icon={KeyRound} disabled={passwordSaving}>
                  {passwordSaving ? "Updating…" : "Update password"}
                </Button>
                <Button variant="ghost" onClick={closePasswordForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
