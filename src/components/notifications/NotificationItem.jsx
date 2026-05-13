"use client";

import { ArrowRight, MessageCircle, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import ProfileIdentityLink from "@/components/ui/ProfileIdentityLink";

function getInitials(name) {
  if (!name) return "SH";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getActorId(notification) {
  return (
    notification?.actor_user_id ||
    notification?.actor_id ||
    notification?.actor?.id ||
    notification?.user_id ||
    notification?.profile_id ||
    notification?.created_by ||
    null
  );
}

function getActorName(notification) {
  return (
    notification?.actor_name_cached ||
    notification?.actor?.full_name ||
    notification?.actor_name ||
    "Someone"
  );
}

function getPostText(notification, fallbackPost) {
  return (
    notification?.post?.body ||
    notification?.post_preview_cached ||
    fallbackPost?.body ||
    notification?.post_title_cached ||
    "Post unavailable"
  );
}

function getCommentText(notification) {
  return (
    notification?.comment?.body ||
    notification?.comment_body_cached ||
    notification?.body ||
    ""
  );
}

function trimText(value, max = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function uniqueActors(notifications = []) {
  const seen = new Set();
  const actors = [];

  notifications.forEach((notification) => {
    const key = getActorId(notification) || getActorName(notification);
    if (!key || seen.has(key)) return;
    seen.add(key);
    actors.push({ id: getActorId(notification), name: getActorName(notification) });
  });

  return actors;
}

function buildSummary(group) {
  const notifications = group?.notifications || [];
  const comments = notifications.filter((item) => item.type === "comment");
  const upvotes = notifications.filter((item) => item.type === "upvote");
  const latest = notifications[0] || {};
  const actors = uniqueActors(notifications);
  const firstName = actors[0]?.name || getActorName(latest);
  const otherCount = Math.max(actors.length - 1, 0);
  const hasComments = comments.length > 0;
  const hasUpvotes = upvotes.length > 0;

  if (hasComments && hasUpvotes) {
    return `${firstName}${otherCount ? ` and ${otherCount} other${otherCount > 1 ? "s" : ""}` : ""} replied to and upvoted your post`;
  }

  if (hasComments) {
    if (comments.length === 1) return `${firstName} commented on your post`;
    return `${firstName}${otherCount ? ` and ${otherCount} other${otherCount > 1 ? "s" : ""}` : ""} commented on your post`;
  }

  if (hasUpvotes) {
    if (upvotes.length === 1) return `${firstName} upvoted your post`;
    return `${firstName}${otherCount ? ` and ${otherCount} other${otherCount > 1 ? "s" : ""}` : ""} upvoted your post`;
  }

  return `${firstName} interacted with your post`;
}

export default function NotificationItem({ notification, group }) {
  const router = useRouter();
  const isGroup = Boolean(group?.notifications?.length);
  const notifications = isGroup ? group.notifications : [notification].filter(Boolean);
  const latest = notifications[0] || notification || {};
  const unread = isGroup ? notifications.some((item) => !item.read) : !latest.read;
  const postId = latest.post_id || group?.postId;
  const fallbackPost = group?.post || null;
  const postText = getPostText(latest, fallbackPost);
  const commentItems = notifications.filter((item) => item.type === "comment").slice(0, 3);
  const upvoteItems = notifications.filter((item) => item.type === "upvote");
  const actors = uniqueActors(notifications);
  const firstActor = actors[0] || { id: getActorId(latest), name: getActorName(latest) };
  const latestTime = latest.created_at;
  const summary = isGroup ? buildSummary(group) : buildSummary({ notifications });
  const hiddenCount = Math.max(notifications.length - commentItems.length - upvoteItems.slice(0, 1).length, 0);

  const openNotification = () => {
    if (postId) {
      router.push(`/post/${postId}`);
      return;
    }

    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={openNotification}
      className="group relative flex w-full items-start gap-3 overflow-hidden rounded-[26px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:gap-4 md:p-5"
      style={{
        backgroundColor: unread ? "#FFFFFF" : "rgba(255,255,255,0.78)",
        borderColor: unread ? "#B9CBE1" : "#D9E3EE",
        boxShadow: unread
          ? "0 14px 34px rgba(11,28,44,0.10)"
          : "0 8px 22px rgba(11,28,44,0.04)",
      }}
    >
      {unread ? <div className="absolute left-0 top-0 h-full w-1.5 bg-[#E8A020]" /> : null}

      <ProfileIdentityLink
        userId={firstActor.id}
        className="relative shrink-0 cursor-pointer transition hover:opacity-85 focus:outline-none"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-extrabold md:h-13 md:w-13"
          style={{
            backgroundColor: unread ? "#0B1C2C" : "#E5EEF8",
            color: unread ? "#FFFFFF" : T.blue,
          }}
        >
          {getInitials(firstActor.name)}
        </div>

        <div
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#FFFFFF",
            color: upvoteItems.length > 0 && commentItems.length === 0 ? T.gold : T.blue,
          }}
        >
          {upvoteItems.length > 0 && commentItems.length === 0 ? (
            <ThumbsUp size={13} strokeWidth={2.5} />
          ) : (
            <MessageCircle size={13} strokeWidth={2.5} />
          )}
        </div>
      </ProfileIdentityLink>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={`text-[15px] leading-snug md:text-[16px] ${unread ? "font-extrabold" : "font-semibold"}`}
              style={{ color: T.navy }}
            >
              {summary}
            </p>

            <div
              className="mt-2 rounded-2xl border px-3 py-2"
              style={{
                backgroundColor: unread ? "#F7FAFD" : "rgba(247,250,253,0.72)",
                borderColor: unread ? "#C8D8EA" : "#DEE8F2",
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.gold }}>
                Your post
              </div>
              <p
                className={`mt-1 line-clamp-2 text-sm leading-6 ${unread ? "font-bold" : "font-medium"}`}
                style={{ color: unread ? T.text : T.textMuted }}
              >
                {trimText(postText, 180)}
              </p>
            </div>

            {commentItems.length > 0 ? (
              <div className="mt-3 space-y-2">
                {commentItems.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <div
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.read ? "#9AA8B8" : T.gold }}
                    />
                    <p className="min-w-0 text-sm leading-6" style={{ color: T.textMuted }}>
                      <ProfileIdentityLink
                        userId={getActorId(item)}
                        className="cursor-pointer font-bold transition hover:opacity-85 focus:outline-none"
                        style={{ color: T.navy }}
                      >
                        {getActorName(item)}
                      </ProfileIdentityLink>
                      {": "}
                      <span className={item.read ? "font-medium" : "font-bold"} style={{ color: item.read ? T.textMuted : T.text }}>
                        {trimText(getCommentText(item), 120) || "Commented"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {upvoteItems.length > 0 ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "#FFF8EA", borderColor: "#F1D497", color: T.navy }}>
                <ThumbsUp size={13} strokeWidth={2.5} style={{ color: T.gold }} />
                {upvoteItems.length === 1 ? "1 new upvote" : `${upvoteItems.length} new upvotes`}
              </div>
            ) : null}

            {hiddenCount > 0 ? (
              <div className="mt-2 text-xs font-semibold" style={{ color: T.textSubtle }}>
                +{hiddenCount} more activity on this post
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: unread ? T.navy : T.textSubtle }}>
              {unread ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: T.gold }} /> : null}
              <span>{latestTime ? timeAgo(latestTime) : "Recently"}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {unread ? (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ backgroundColor: "#EAF1FA", color: T.navy }}>
                New
              </span>
            ) : null}

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full transition group-hover:translate-x-0.5"
              style={{ backgroundColor: "#F1F5FA", color: T.navy }}
            >
              <ArrowRight size={16} strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
