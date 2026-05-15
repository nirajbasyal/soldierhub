"use client";

import Link from "next/link";
import { useApp } from "@/store/AppContext";
import { getProfileHref, writeProfilePreview } from "@/lib/profileLinks";

export { getProfileHref };

export default function ProfileIdentityLink({
  userId,
  fallbackName = "",
  profile,
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
      return;
    }

    if (userId && href !== "/profile") {
      writeProfilePreview(userId, {
        id: userId,
        full_name: fallbackName,
        ...(profile || {}),
      });
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
