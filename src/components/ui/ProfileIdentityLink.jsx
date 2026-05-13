"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/store/AppContext";

export function getProfileHref(userId, currentUser, fallbackName = "") {
  if (!userId) return "";
  if (currentUser?.id && userId === currentUser.id) return "/profile";

  const query = fallbackName ? `?name=${encodeURIComponent(fallbackName)}` : "";
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

  const canOpen = Boolean(userId && !disabled);

  const openProfile = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!canOpen) return;

    if (!currentUser) {
      setAuthModal?.("login");
      return;
    }

    router.push(getProfileHref(userId, currentUser, fallbackName));
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
