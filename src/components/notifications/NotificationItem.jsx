"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import { useApp } from "@/store/AppContext";

function getInitials(name) {
  if (!name) return "SH";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function NotificationItem({ notification }) {
  const router = useRouter();
  const { posts } = useApp();

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

  const openNotification = () => {
    if (notification.post_id) {
      router.push(`/post/${notification.post_id}`);
      return;
    }

    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={openNotification}
      className="group text-left rounded-3xl border p-4 md:p-5 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg relative overflow-hidden"
      style={{
        backgroundColor: notification.read ? "rgba(255,255,255,0.9)" : T.card,
        borderColor: notification.read ? T.border : "#BCD0EA",
        boxShadow: notification.read
          ? "0 8px 22px rgba(7,27,51,0.04)"
          : "0 14px 34px rgba(30,78,140,0.10)",
      }}
    >
      {!notification.read && (
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />
      )}

      <div className="relative shrink-0">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm"
          style={{
            background: notification.read
              ? "rgba(220,232,247,0.75)"
              : "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)",
            color: notification.read ? T.blue : "#FFFFFF",
          }}
        >
          {getInitials(actorName)}
        </div>

        <div
          className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full border-2 flex items-center justify-center"
          style={{
            backgroundColor: notification.read ? T.surface : "#FFFFFF",
            borderColor: T.card,
            color: T.blue,
          }}
        >
          <MessageCircle size={13} strokeWidth={2.4} />
        </div>
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] leading-snug" style={{ color: T.text }}>
              <span className="font-bold" style={{ color: T.navy }}>
                {actorName}
              </span>{" "}
              commented on your post
            </div>

            <div
              className="mt-2 rounded-2xl border px-3 py-2 text-sm leading-relaxed line-clamp-2"
              style={{
                background:
                  "linear-gradient(135deg, rgba(244,248,253,0.95), rgba(253,254,255,0.95))",
                borderColor: "#D5E2F2",
                color: T.textMuted,
              }}
            >
              {postTitle}
            </div>

            <div
              className="mt-2 text-xs font-medium"
              style={{ color: T.textSubtle }}
            >
              {timeAgo(notification.created_at)}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {!notification.read && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{
                  backgroundColor: "rgba(220,232,247,0.95)",
                  color: T.blue,
                }}
              >
                New
              </span>
            )}

            <div
              className="h-9 w-9 rounded-full flex items-center justify-center transition group-hover:translate-x-0.5"
              style={{
                backgroundColor: "rgba(244,248,253,0.95)",
                color: T.navy,
              }}
            >
              <ArrowRight size={16} strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
