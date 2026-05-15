"use client";

import Link from "next/link";
import { useApp } from "@/store/AppContext";

function cleanFallbackName(value) {
  const name = String(value || "").trim();
  if (!name || name === "Member" || name === "Someone") return "";
  return name.slice(0, 80);
}

function normalizeUserId(value) {
  const id = String(value || "").trim();
  if (!id || id === "null" || id === "undefined") return "";
  return id;
}

export function getProfileHref(userId, currentUser, fallbackName = "") {
  const safeUserId = normalizeUserId(userId);
  const safeName = cleanFallbackName(fallbackName);

  if (!safeUserId) return "";
  if (currentUser?.id && safeUserId === currentUser.id) return "/profile";

  const query = safeName ? `?name=${encodeURIComponent(safeName)}` : "";
  return `/profile/${encodeURIComponent(safeUserId)}${query}`;
}

export default function ProfileIdentityLink({
  userId,
  fallbackName = "",
  disabled = false,
  children,
  className = "",
  style,
  title = "View profile",
  ariaLabel,
  prefetch = false,
}) {
  const { currentUser, setAuthModal } = useApp();
  const href = getProfileHref(userId, currentUser, fallbackName);
  const canOpen = Boolean(href && !disabled);

  const handleClick = (event) => {
    // Profile links are often rendered inside clickable cards.
    // Stop bubbling so clicking a username/avatar opens the profile,
    // not the surrounding notification/post action.
    event.stopPropagation();

    if (!canOpen) {
      event.preventDefault();
      return;
    }

    if (!currentUser) {
      event.preventDefault();
      setAuthModal?.("login");
    }
  };

  if (!canOpen) {
    return (
      <span
        aria-disabled="true"
        className={className}
        style={style}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      title={title}
      aria-label={ariaLabel || title}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
