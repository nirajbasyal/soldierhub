"use client";

import { Share2 } from "lucide-react";
import { T } from "@/lib/theme";
import { shareProfileLink } from "@/lib/shareProfile";

export default function ShareProfileButton({
  profileId,
  profileName,
  pushToast,
  variant = "light",
  className = "",
}) {
  const isDark = variant === "dark";

  const handleShare = async () => {
    const result = await shareProfileLink({
      profileId,
      profileName,
      title: profileName ? `${profileName} · SoldierHub` : "SoldierHub profile",
    });

    if (result?.cancelled) return;

    if (result?.ok) {
      pushToast?.(
        result.method === "clipboard" ? "Profile link copied." : "Profile shared.",
        "success"
      );
      return;
    }

    pushToast?.("Could not share this profile link.", "error");
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={!profileId}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={{
        backgroundColor: isDark ? T.navy : "rgba(255,255,255,0.92)",
        borderColor: isDark ? "rgba(7,27,51,0.18)" : "#D5E2F2",
        color: isDark ? "#FFFFFF" : T.navy,
      }}
    >
      <Share2 size={16} />
      Share profile
    </button>
  );
}
