"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowBigUp, ArrowRight, MessageCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import ProfileIdentityLink from "@/components/ui/ProfileIdentityLink";

const SOFT_BLUE = "#EEF3F7";
const SLATE_BLUE = "#3F5F7D";
const NAVY = "#0B1C2C";

function getInitials(name) {
  if (!name) return "SH";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function decodeCommonHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

function richTextToPlainText(value) {
  if (value === null || value === undefined) return "";

  return decodeCommonHtmlEntities(value)
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<\s*\/\s*(p|div|blockquote|li|ul|ol|h[1-6])\s*>/gi, " ")
    .replace(/<\s*li[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getActorId(notification) {
  return (
    notification?.comment?.author_id ||
    notification?.actor_user_id ||
    notification?.actor_id ||
    notification?.actor_profile?.id ||
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
    notification?.actor_profile?.full_name ||
    notification?.actor?.full_name ||
    notification?.actor_name ||
    "Someone"
  );
}

function getActorAvatarUrl(notification) {
  return (
    notification?.actor_avatar_url ||
    notification?.actor_profile?.avatar_url ||
    notification?.actor?.avatar_url ||
    notification?.comment?.author_avatar_url ||
    notification?.comment?.author_avatar_url_cached ||
    null
  );
}

function getProfileLinkName(name) {
  const cleaned = String(name || "Someone").trim();
  if (!cleaned || cleaned === "Someone") return "";
  return cleaned;
}

function getNotificationPostId(notification, group) {
  return (
    notification?.post_id ||
    notification?.postId ||
    notification?.post?.id ||
    notification?.post?.post_id ||
    notification?.comment?.post_id ||
    notification?.comment?.postId ||
    group?.postId ||
    group?.post_id ||
    group?.post?.id ||
    group?.post?.post_id ||
    null
  );
}

function getPostText(notification, fallbackPost) {
  const rawPostText =
    notification?.post?.body ||
    notification?.post_preview_cached ||
    fallbackPost?.body ||
    notification?.post_title_cached ||
    "Post unavailable";

  return richTextToPlainText(rawPostText) || "Post unavailable";
}

function getCommentText(notification) {
  const rawCommentText =
    notification?.comment?.body ||
    notification?.comment_body_cached ||
    notification?.body ||
    "";

  return richTextToPlainText(rawCommentText);
}

function isFollowNotification(notification) {
  return String(notification?.type || "").toLowerCase() === "follow";
}

function trimWords(value, maxWords = 4) {
  const words = richTextToPlainText(value)
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
    actors.push({
      id: getActorId(notification),
      name: getActorName(notification),
      avatarUrl: getActorAvatarUrl(notification),
    });
  });

  return actors;
}

function buildSummary(group) {
  const notifications = group?.notifications || [];
  const follows = notifications.filter(isFollowNotification);
  const comments = notifications.filter((item) => item.type === "comment");
  const upvotes = notifications.filter((item) => item.type === "upvote");
  const latest = notifications[0] || {};
  const actors = uniqueActors(notifications);
  const firstName = actors[0]?.name || getActorName(latest);
  const otherCount = Math.max(actors.length - 1, 0);
  const hasComments = comments.length > 0;
  const hasUpvotes = upvotes.length > 0;
  const hasFollows = follows.length > 0;

  if (hasFollows) {
    if (follows.length === 1) return `${firstName} followed your profile`;
    return `${firstName}${otherCount ? ` and ${otherCount} other${otherCount > 1 ? "s" : ""}` : ""} followed your profile`;
  }

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
  const isFollow = isFollowNotification(latest);
  const fallbackPost = group?.post || latest?.post || null;
  const postId = getNotificationPostId(latest, group);
  const postText = getPostText(latest, fallbackPost);
  const commentItems = notifications.filter((item) => item.type === "comment");
  const latestComment = commentItems[0] || null;
  const upvoteItems = notifications.filter((item) => item.type === "upvote");
  const actors = uniqueActors(notifications);
  const firstActor = actors[0] || {
    id: getActorId(latest),
    name: getActorName(latest),
    avatarUrl: getActorAvatarUrl(latest),
  };
  const latestTime = latest.created_at;
  const summary = isGroup ? buildSummary(group) : buildSummary({ notifications });
  const visibleActivityCount = isFollow
    ? notifications.length
    : (latestComment ? 1 : 0) + (upvoteItems.length > 0 ? upvoteItems.length : 0);
  const hiddenCount = isFollow ? 0 : Math.max(notifications.length - visibleActivityCount, 0);
  const firstActorFallbackName = getProfileLinkName(firstActor.name);
  const notificationIcon = isFollow
    ? UserPlus
    : upvoteItems.length > 0 && !latestComment
      ? ArrowBigUp
      : MessageCircle;
  const NotificationIcon = notificationIcon;
  const commentText = latestComment ? getCommentText(latestComment) : "";
  const commenterName = latestComment ? getActorName(latestComment) : "";

  const openNotification = () => {
    if (isFollow && firstActor.id) {
      router.push(`/profile/${encodeURIComponent(firstActor.id)}`);
      return;
    }

    if (postId) {
      router.push(`/post/${encodeURIComponent(postId)}?replies=1&from=notifications`);
      return;
    }

    router.push("/notifications");
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
      onMouseDown={(event) => {
        if (event.detail > 0) event.preventDefault();
      }}
      className="group relative flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-150 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9DB6CF]"
      style={{
        backgroundColor: unread ? "#FFFFFF" : "rgba(255,255,255,0.62)",
        borderColor: unread ? "#D4E0EF" : "#E6EDF4",
        boxShadow: unread ? "0 3px 12px rgba(11,28,44,0.045)" : "none",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {unread ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
          style={{ backgroundColor: T.brandRed }}
          aria-hidden="true"
        />
      ) : null}

      <ProfileIdentityLink
        userId={firstActor.id}
        fallbackName={firstActorFallbackName}
        className="relative shrink-0 cursor-pointer transition hover:opacity-90 focus:outline-none"
      >
        {firstActor.avatarUrl ? (
          <img
            src={firstActor.avatarUrl}
            alt={firstActor.name || "Profile avatar"}
            className="h-10 w-10 rounded-xl border object-cover"
            style={{ borderColor: "#E6EEF6" }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-bold"
            style={{
              backgroundColor: unread ? NAVY : SOFT_BLUE,
              color: unread ? "#FFFFFF" : SLATE_BLUE,
            }}
          >
            {getInitials(firstActor.name)}
          </div>
        )}

        <div
          className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#FFFFFF", color: SLATE_BLUE }}
        >
          <NotificationIcon size={11} strokeWidth={2.5} />
        </div>
      </ProfileIdentityLink>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={`min-w-0 flex-1 text-[13.5px] leading-snug ${unread ? "font-semibold" : "font-medium"}`}
            style={{ color: T.navy }}
          >
            {summary}
          </p>
          {unread ? (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: T.brandRed }} aria-hidden="true" />
          ) : null}
        </div>

        {!isFollow && postText ? (
          <p className="mt-0.5 truncate text-xs leading-5" style={{ color: T.textMuted }}>
            {trimWords(postText, 14)}
          </p>
        ) : null}

        {latestComment && commentText ? (
          <p className="mt-0.5 truncate text-xs leading-5" style={{ color: T.textSubtle }}>
            <span className="font-semibold" style={{ color: T.textSecondary }}>
              {commenterName}:
            </span>{" "}
            {trimWords(commentText, 12)}
          </p>
        ) : null}

        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: T.textSubtle }}>
          <span>{latestTime ? timeAgo(latestTime) : "Recently"}</span>
          {upvoteItems.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{upvoteItems.length === 1 ? "1 upvote" : `${upvoteItems.length} upvotes`}</span>
            </>
          ) : null}
          {hiddenCount > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>+{hiddenCount} more</span>
            </>
          ) : null}
        </div>
      </div>

      <ArrowRight
        size={15}
        strokeWidth={2.4}
        className="shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: T.textSubtle }}
        aria-hidden="true"
      />
    </div>
  );
}
