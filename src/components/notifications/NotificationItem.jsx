"use client";

import { ArrowRight, MessageCircle, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import ProfileIdentityLink from "@/components/ui/ProfileIdentityLink";

const THEME_RED = "#B31942";

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
    notification?.comment?.author_id ||
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

function getProfileLinkName(name) {
  const cleaned = String(name || "Someone").trim();
  if (!cleaned || cleaned === "Someone") return "";
  return cleaned;
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

function trimWords(value, maxWords = 4) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
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
  const commentItems = notifications.filter((item) => item.type === "comment");
  const latestComment = commentItems[0] || null;
  const upvoteItems = notifications.filter((item) => item.type === "upvote");
  const actors = uniqueActors(notifications);
  const firstActor = actors[0] || { id: getActorId(latest), name: getActorName(latest) };
  const latestTime = latest.created_at;
  const summary = isGroup ? buildSummary(group) : buildSummary({ notifications });
  const visibleActivityCount = (latestComment ? 1 : 0) + (upvoteItems.length > 0 ? upvoteItems.length : 0);
  const hiddenCount = Math.max(notifications.length - visibleActivityCount, 0);
  const firstActorFallbackName = getProfileLinkName(firstActor.name);
  const latestCommentFallbackName = getProfileLinkName(getActorName(latestComment));

  const openNotification = () => {
    if (postId) {
      router.push(`/post/${encodeURIComponent(postId)}?replies=1`);
      return;
    }

    router.push("/");
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openNotification();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openNotification}
      onKeyDown={handleKeyDown}
      className="group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-[26px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 md:gap-4 md:p-5"
      style={{
        backgroundColor: unread ? "#FFFFFF" : "rgba(255,255,255,0.78)",
        borderColor: unread ? "#B9CBE1" : "#D9E3EE",
        boxShadow: unread
          ? "0 14px 34px rgba(11,28,44,0.10)"
          : "0 8px 22px rgba(11,28,44,0.04)",
      }}
    >
      {unread ? <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: THEME_RED }} /> : null}

      <ProfileIdentityLink
        userId={firstActor.id}
        fallbackName={firstActorFallbackName}
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
            color: upvoteItems.length > 0 && !latestComment ? T.gold : T.blue,
          }}
        >
          {upvoteItems.length > 0 && !latestComment ? (
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
              <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: THEME_RED }}>
                Your post
              </div>
              <p
                className={`mt-1 text-sm leading-6 ${unread ? "font-bold" : "font-medium"}`}
                style={{ color: unread ? T.text : T.textMuted }}
              >
                {trimWords(postText, 3)}
              </p>
            </div>

            {latestComment ? (
              <div className="mt-3 flex gap-2">
                <div
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: latestComment.read ? "#9AA8B8" : THEME_RED }}
                />
                <p className="min-w-0 text-sm leading-6" style={{ color: T.textMuted }}>
                  <ProfileIdentityLink
                    userId={getActorId(latestComment)}
                    fallbackName={latestCommentFallbackName}
                    className="cursor-pointer font-bold transition hover:opacity-85 focus:outline-none"
                    style={{ color: T.navy }}
                  >
                    {getActorName(latestComment)}
                  </ProfileIdentityLink>
                  {": "}
                  <span
                    className={latestComment.read ? "font-medium" : "font-bold"}
                    style={{ color: latestComment.read ? T.textMuted : T.text }}
                  >
                    {trimWords(getCommentText(latestComment), 4) || "Commented"}
                  </span>
                </p>
              </div>
            ) : null}

            {upvoteItems.length > 0 ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "#FFF8EA", borderColor: "#F1D497", color: T.navy }}>
                <ThumbsUp size={13} strokeWidth={2.5} style={{ color: T.gold }} />
                {upvoteItems.length === 1 ? "1 upvote" : `${upvoteItems.length} upvotes`}
              </div>
            ) : null}

            {hiddenCount > 0 ? (
              <div className="mt-2 text-xs font-semibold" style={{ color: T.textSubtle }}>
                +{hiddenCount} more activity on this post
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: unread ? T.navy : T.textSubtle }}>
              {unread ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: THEME_RED }} /> : null}
              <span>{latestTime ? timeAgo(latestTime) : "Recently"}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {unread ? (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ backgroundColor: "#FBE8EE", color: THEME_RED }}>
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
    </div>
  );
}
