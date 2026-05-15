export function getProfileShareUrl(profileId, profileName = "") {
  if (!profileId || typeof window === "undefined") return "";

  const origin = window.location?.origin || "https://www.soldierhub.com";
  const url = new URL(`/profile/${encodeURIComponent(profileId)}`, origin);
  const cleanName = typeof profileName === "string" ? profileName.trim() : "";

  if (cleanName) url.searchParams.set("name", cleanName);

  return url.toString();
}

async function copyTextToClipboard(text) {
  if (!text || typeof window === "undefined") return false;

  if (navigator?.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    document.body.removeChild(textarea);
    return false;
  }
}

export async function shareProfileLink({ profileId, profileName = "", title = "SoldierHub profile" }) {
  const url = getProfileShareUrl(profileId, profileName);

  if (!url) {
    return { ok: false, reason: "missing-profile" };
  }

  const cleanName = typeof profileName === "string" ? profileName.trim() : "";
  const shareData = {
    title,
    text: cleanName
      ? `View ${cleanName}'s SoldierHub profile.`
      : "View this SoldierHub profile.",
    url,
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return { ok: true, method: "native", url };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { ok: false, cancelled: true, url };
      }
      // If native share fails for any reason, quietly fall back to copy.
    }
  }

  const copied = await copyTextToClipboard(url);

  if (!copied) {
    return { ok: false, reason: "copy-failed", url };
  }

  return { ok: true, method: "clipboard", url };
}
