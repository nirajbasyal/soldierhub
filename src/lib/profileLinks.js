const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROFILE_PREVIEW_CACHE_PREFIX = "soldierhub_profile_preview_v2:";
const PROFILE_PREVIEW_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;

export function isValidProfileId(value) {
  return UUID_PATTERN.test(String(value || "").trim());
}

export function cleanProfileName(value) {
  const name = String(value || "").trim();
  if (!name || name === "Member" || name === "Someone" || name === "undefined" || name === "null") return "";
  return name.slice(0, 80);
}

export function normalizeProfilePreview(profile = {}, fallback = {}) {
  const id = String(profile.id || profile.profile_id || fallback.id || fallback.profile_id || "").trim();
  if (!isValidProfileId(id)) return null;

  const fullName =
    cleanProfileName(profile.full_name || profile.author_name || profile.author_name_cached || fallback.full_name || fallback.name) ||
    "SoldierHub member";

  return {
    id,
    full_name: fullName,
    bio: profile.bio || fallback.bio || "",
    avatar_color:
      profile.avatar_color ||
      profile.author_color ||
      profile.author_color_cached ||
      fallback.avatar_color ||
      "#314A66",
    avatar_url: profile.avatar_url || fallback.avatar_url || null,
    base: profile.base || fallback.base || "Fort Bliss",
    status: profile.status || profile.verification_status || fallback.status || "verified",
  };
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage || window.localStorage || null;
  } catch {
    return null;
  }
}

export function readProfilePreview(profileId) {
  const safeProfileId = String(profileId || "").trim();
  if (!isValidProfileId(safeProfileId)) return null;

  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(`${PROFILE_PREVIEW_CACHE_PREFIX}${safeProfileId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > PROFILE_PREVIEW_CACHE_MAX_AGE_MS) {
      storage.removeItem(`${PROFILE_PREVIEW_CACHE_PREFIX}${safeProfileId}`);
      return null;
    }

    return normalizeProfilePreview(parsed?.profile, { id: safeProfileId });
  } catch {
    storage.removeItem(`${PROFILE_PREVIEW_CACHE_PREFIX}${safeProfileId}`);
    return null;
  }
}

export function writeProfilePreview(profileId, profile = {}) {
  const safeProfileId = String(profileId || profile.id || profile.profile_id || "").trim();
  if (!isValidProfileId(safeProfileId)) return;

  const preview = normalizeProfilePreview(profile, { id: safeProfileId });
  if (!preview) return;

  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      `${PROFILE_PREVIEW_CACHE_PREFIX}${safeProfileId}`,
      JSON.stringify({ profile: preview, savedAt: Date.now() })
    );
  } catch {
    // Best-effort cache only. Navigation must still work without it.
  }
}

export function getProfileHref(userId, currentUser, fallbackName = "") {
  const safeUserId = String(userId || "").trim();
  const safeName = cleanProfileName(fallbackName);

  if (!isValidProfileId(safeUserId)) return "";
  if (currentUser?.id && safeUserId === currentUser.id) return "/profile";

  const query = safeName ? `?name=${encodeURIComponent(safeName)}` : "";
  return `/profile/${encodeURIComponent(safeUserId)}${query}`;
}
