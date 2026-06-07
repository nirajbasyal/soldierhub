import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";

const PROFILE_CACHE_KEY = "soldierhub_current_profile_v1";
const FEED_CACHE_KEYS = ["soldierhub_feed_cache_v2", "soldierhub_feed_cache_v3"];
const COMMENT_CACHE_PREFIXES = [
  "soldierhub_comment_cache_v2:",
  "soldierhub_comment_cache_v3:",
];

function writeProfileCache(profile) {
  if (typeof window === "undefined" || !profile?.id) return;

  try {
    window.localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ profile, savedAt: Date.now() })
    );
  } catch {
    // Local cache is only a first-paint helper. Ignore storage errors safely.
  }
}

function clearAvatarSensitiveCaches() {
  if (typeof window === "undefined") return;

  try {
    FEED_CACHE_KEYS.forEach((key) => window.localStorage.removeItem(key));

    Object.keys(window.localStorage).forEach((key) => {
      if (COMMENT_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // Cache cleanup must never block profile saving.
  }
}

function getAuthorId(item = {}) {
  return (
    item?.author_id ||
    item?.author_user_id ||
    item?.comment_author_id ||
    item?.comment_author_user_id ||
    item?.commenter_id ||
    item?.commenter_user_id ||
    item?.actor_user_id ||
    item?.actor_id ||
    item?.user_id ||
    item?.profile_id ||
    item?.created_by ||
    item?.created_by_id ||
    item?.owner_id ||
    item?.profile?.id ||
    item?.author?.id ||
    item?.user?.id ||
    item?.commenter?.id ||
    item?.actor?.id ||
    null
  );
}

function isMaskedAnonymousIdentity(item = {}) {
  const name = String(
    item?.author_name_cached ||
      item?.author_name ||
      item?.comment_author_name ||
      item?.commenter_name ||
      ""
  )
    .trim()
    .toLowerCase();

  return Boolean(
    item?.anonymous === true ||
      item?.is_anonymous_author === true ||
      item?.comment_anonymous === true ||
      name.startsWith("anonymous")
  );
}

function refreshIdentityItem(item = {}, profile = {}) {
  if (!profile?.id || getAuthorId(item) !== profile.id) return item;
  if (isMaskedAnonymousIdentity(item)) return item;

  const avatarUrl = profile.avatar_url || null;
  const fullName = profile.full_name || item.author_name_cached || item.author_name || "Member";
  const avatarColor = profile.avatar_color || item.author_color_cached || item.author_color || null;

  return {
    ...item,
    author_name: fullName,
    author_name_cached: fullName,
    author_color: avatarColor,
    author_color_cached: avatarColor,
    author_avatar_url: avatarUrl,
    author_avatar_url_cached: avatarUrl,
    profile_avatar_url: avatarUrl,
    avatar_url: avatarUrl,
    profile: item.profile ? { ...item.profile, full_name: fullName, avatar_color: avatarColor, avatar_url: avatarUrl } : item.profile,
    author: item.author ? { ...item.author, full_name: fullName, avatar_color: avatarColor, avatar_url: avatarUrl } : item.author,
    user: item.user ? { ...item.user, full_name: fullName, avatar_color: avatarColor, avatar_url: avatarUrl } : item.user,
  };
}

function replaceProfileInList(list = [], profile = {}) {
  if (!Array.isArray(list) || !profile?.id) return list || [];

  return list.map((item) => (item?.id === profile.id ? { ...item, ...profile } : item));
}

function refreshProfileEverywhere({
  profile,
  setCurrentUser,
  setUsers,
  setPendingUsers,
  setBlockedUsers,
  setPosts,
  setMyPosts,
  setPostComments,
}) {
  if (!profile?.id) return;

  setCurrentUser(profile);
  setUsers?.((list) => replaceProfileInList(list, profile));
  setPendingUsers?.((list) => replaceProfileInList(list, profile));
  setBlockedUsers?.((list) => replaceProfileInList(list, profile));

  setPosts?.((list) => (list || []).map((item) => refreshIdentityItem(item, profile)));
  setMyPosts?.((list) => (list || []).map((item) => refreshIdentityItem(item, profile)));
  setPostComments?.((map) => {
    const next = {};

    Object.entries(map || {}).forEach(([postId, comments]) => {
      next[postId] = (comments || []).map((comment) => refreshIdentityItem(comment, profile));
    });

    return next;
  });
}

export function useProfileActions({
  SUPA,
  currentUser,
  setCurrentUser,
  setUsers,
  setPendingUsers,
  setBlockedUsers,
  setPosts,
  setMyPosts,
  setPostComments,
  requireAuth,
  pushToast,
  sendToPendingReview,
  reloadPosts,
  reloadMyPosts,
}) {
  const updateProfile = async (updates) => {
    if (!requireAuth()) {
      return { ok: false, error: "Please sign in again before updating your profile." };
    }

    if (SUPA) {
      const { data, error } = await ProfilesDB.updateMyProfile(
        currentUser.id,
        updates
      );
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      const updatedProfile = data || { ...currentUser, ...updates };
      clearAvatarSensitiveCaches();
      writeProfileCache(updatedProfile);
      refreshProfileEverywhere({
        profile: updatedProfile,
        setCurrentUser,
        setUsers,
        setPendingUsers,
        setBlockedUsers,
        setPosts,
        setMyPosts,
        setPostComments,
      });

      pushToast("Profile updated", "success");
      reloadPosts?.({ silent: true });
      reloadMyPosts?.();
      return { ok: true, data: updatedProfile };
    }

    const updated = { ...currentUser, ...updates };

    clearAvatarSensitiveCaches();
    writeProfileCache(updated);
    refreshProfileEverywhere({
      profile: updated,
      setCurrentUser,
      setUsers,
      setPendingUsers,
      setBlockedUsers,
      setPosts,
      setMyPosts,
      setPostComments,
    });

    pushToast("Profile updated", "success");
    return { ok: true, data: updated };
  };

  const requestRereview = async ({ phone } = {}) => {
    const cleanPhone = phone?.trim() || "";

    if (!currentUser) {
      return { ok: false, error: "You must be signed in to request re-review." };
    }

    if (SUPA) {
      const { error } = await ProfilesDB.requestProfileRereview({
        phone: cleanPhone,
      });
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      const { profile } = await Auth.getCurrentUser();
      const updated = profile || {
        ...currentUser,
        verification_status: "pending",
        phone: cleanPhone || currentUser.phone,
      };

      setCurrentUser(updated);
      pushToast(
        "Re-review request submitted. Your profile is pending admin review again.",
        "success"
      );
      sendToPendingReview({
        email: updated.email || updated.personal_email || "",
        name: updated.full_name || "",
        found: 1,
        status: "pending",
        replace: true,
      });
      return { ok: true, data: updated };
    }

    const updated = {
      ...currentUser,
      verification_status: "pending",
      phone: cleanPhone || currentUser.phone,
    };

    const matchesMe = (u) =>
      u.id === currentUser.id ||
      u.email === currentUser.email ||
      u.personal_email === currentUser.personal_email;

    setCurrentUser(updated);
    setUsers((l) => l.filter((u) => !matchesMe(u)));
    setBlockedUsers((l) => l.filter((u) => !matchesMe(u)));
    setPendingUsers((l) => {
      const exists = l.some((u) => u.id === currentUser.id);
      return exists
        ? l.map((u) => (u.id === currentUser.id ? updated : u))
        : [...l, updated];
    });

    pushToast("Re-review request submitted", "success");
    sendToPendingReview({
      email: updated.email || updated.personal_email || "",
      name: updated.full_name || "",
      found: 1,
      status: "pending",
      replace: true,
    });
    return { ok: true, data: updated };
  };

  return { updateProfile, requestRereview };
}
