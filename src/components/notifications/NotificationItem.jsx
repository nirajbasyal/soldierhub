"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import { useApp } from "@/store/AppContext";

export default function NotificationItem({ notification }) {
  const router = useRouter();
  const { posts } = useApp();

  // Live mode uses cached fields; demo mode falls back to flat or joined shape.
  const actorName =
    notification.actor_name_cached ||
    notification.actor?.full_name ||
    notification.actor_name ||
    "Someone";
  const postTitle =
    notification.post_title_cached ||
    notification.post?.title ||
    posts.find((p) => p.id === notification.post_id)?.title ||
    "your post";

  return (
    <button
      onClick={() => router.push("/")}
      className="text-left rounded-2xl border p-4 flex items-start gap-3 transition-shadow hover:shadow-sm"
      style={{
        backgroundColor: notification.read ? T.card : T.surface,
        borderColor: notification.read ? T.border : T.goldSoft,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: T.goldBg }}
      >
        <MessageCircle size={16} style={{ color: T.gold }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm" style={{ color: T.text }}>
          <span className="font-semibold">{actorName}</span> commented on your post
        </div>
        <div className="text-sm mt-0.5 truncate" style={{ color: T.textMuted }}>
          {postTitle}
        </div>
        <div className="text-xs mt-1" style={{ color: T.textSubtle }}>
          {timeAgo(notification.created_at)}
        </div>
      </div>
      {!notification.read && (
        <span
          className="w-2 h-2 rounded-full mt-2 shrink-0"
          style={{ backgroundColor: T.gold }}
        />
      )}
    </button>
  );
}
