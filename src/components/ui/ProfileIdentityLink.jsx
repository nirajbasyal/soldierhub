"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/store/AppContext";

function cleanFallbackName(value) {
  const name = String(value || "").trim();
  if (!name || name === "Member" || name === "Someone") return "";
  return name.slice(0, 80);
}

export function getProfileHref(userId, currentUser, fallbackName = "") {
  const safeName = cleanFallbackName(fallbackName);

  if (!userId) return "";
  if (currentUser?.id && userId === currentUser.id) return "/profile";

  const query = safeName ? `?name=${encodeURIComponent(safeName)}` : "";
  return `/profile/${encodeURIComponent(userId)}${query}`;
}

export default function ProfileIdentityLink({
  userId,
  fallbackName = "",
  disabled = false,
  children,
  className = "",
  style,
  title = "View profile",
}) {
  const router = useRouter();
  const { currentUser, setAuthModal } = useApp();
  const href = getProfileHref(userId, currentUser, fallbackName);
  const canOpen = Boolean(href && !disabled);

  const openProfile = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!canOpen) return;

    if (!currentUser) {
      setAuthModal?.("login");
      return;
    }

    router.push(href);
  };

  const handleKeyDown = (event) => {
    if (!canOpen) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    openProfile(event);
  };

  return (
    <span
      role={canOpen ? "link" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      title={canOpen ? title : undefined}
      onClick={openProfile}
      onKeyDown={handleKeyDown}
      className={className}
      style={style}
    >
      {children}
    </span>
  );
}
