"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowBigUp, Lock, MessageCircle, MoreHorizontal, Send, Share2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { colorFromString, shareOrCopy } from "@/lib/helpers";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";

const POST_PREVIEW_LENGTH = 360;
const COMMENT_PREVIEW_LENGTH = 120;

function getAnonymousDisplayName(postId) {
  const source = String(postId || "anonymous");
  let total = 0;
  for (let i = 0; i < source.length; i += 1) total += source.charCodeAt(i) * (i + 1);
  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

function getCommentAuthorId(comment) {
  return (
    comment.author_id ||
    comment.user_id ||
    comment.profile_id ||
    comment.commenter_id ||
    comment.created_by ||
    comment.created_by_id ||
    comment.author_user_id ||
    comment.author?.id ||
    comment.user?.id ||
    comment.profile?.id ||
    null
  );
}

function getSafeCommentAuthor({ comment, post }) {
  const anonymousName = getAnonymousDisplayName(post.id);
  const authorId = getCommentAuthorId(comment);
  const isAnonymousPostAuthorComment =
    post.anonymous &&
    (comment.is_anonymous_author === true ||
      (authorId && post.author_id && authorId === post.author_id));

  if (isAnonymousPostAuthorComment) {
    return { name: anonymousName, color: "#5C6470", anonymous: true, authorId: null };
  }

  return {
    name: comment.author_name_cached || comment.author?.full_name || comment.profile?.full_name || comment.user?.full_name || comment.author_name || "Member",
    color: comment.author_color_cached || comment.author?.avatar_color || comment.profile?.avatar_color || comment.user?.avatar_color || comment.author_color || "#314A66",
    anonymous: false,
    authorId,
  };
}

function ProfileIdentity({ href, name, color, size = 42, children }) {
  if (!href) return children || <Avatar name={name} color={color} size={size} />;

  const isTextLink = Boolean(children);

  return (
    <Link
      href={href}
      className={
        isTextLink
          ? "inline-flex min-w-0 rounded-md outline-none focus-visible:underline"
          : "inline-flex min-w-0 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
      }
      style={isTextLink ? undefined : { "--tw-ring-color": T.blue }}
    >
      {children || <Avatar name={name} color={color} size={size} />}
    </Link>
  );
}

function FeedActionButton({ icon: Icon, label, count, active = false, onClick, fillWhenActive = false }) {
  const countLabel = typeof count === "number" && count > 99 ? "99+" : count;
  const activeColor = "#4B5563";
  const inactiveColor = T.textMuted;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 h-10 rounded-xl text-xs md:text-sm transition-all inline-flex items-center justify-center gap-1.5 px-2 md:px-3 active:scale-[0.98] ${active ? "font-extrabold" : "font-semibold"}`}
      style={{
        color: active ? activeColor : inactiveColor,
        backgroundColor: "transparent",
      }}
    >
      <Icon
        size={18}
        className="shrink-0"
        strokeWidth={active ? 2.8 : 2.25}
        fill={active && fillWhenActive ? "currentColor" : "none"}
      />
      <span className="min-w-0 truncate">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className={`shrink-0 text-[11px] leading-none ${active ? "font-extrabold" : "font-bold"}`} style={{ color: active ? activeColor : T.textSubtle }}>
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}

function LoadingReplies() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium" style={{ color: T.textSubtle }}>
      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      Loading replies...
    </div>
  );
}

export default function PostCard({ post }) {
  const { currentUser, requireAuth, pushToast, upvotePost, reportPost, commentOnPost, myUpvotes, myReports, myPosts, postComments, loadCommentsForPost } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const cat = CATEGORIES.find((c) => c.key === post.category) || CATEGORIES[0];
  const userUpvoted = Boolean(currentUser && myUpvotes.has(post.id));
  const userReported = Boolean(myReports.has(post.id));
  const isReported = post.status === "reported";
  const anonymousDisplayName = getAnonymousDisplayName(post.id);
  const displayName = post.anonymous ? anonymousDisplayName : post.author_name || "Member";
  const displayColor = post.anonymous ? "#5C6470" : post.author_color || colorFromString(post.author_name || "Member");
  const authorProfileHref = !post.anonymous && post.author_id ? `/users/${post.author_id}` : null;

  const comments = postComments[post.id] || [];
  const commentCount = post.comment_count ?? comments.length;
  const upvoteCount = post.upvote_count ?? 0;

  const ownsPostBySafeViewerFlag = post.viewer_is_author === true;
  const ownsPostByVisibleAuthorId = currentUser?.id && post.author_id && post.author_id === currentUser.id;
  const ownsPostByMyPosts = currentUser?.id && Array.isArray(myPosts) && myPosts.some((myPost) => myPost.id === post.id);
  const currentUserIsAnonymousPostAuthor = Boolean(post.anonymous) && Boolean(ownsPostBySafeViewerFlag || ownsPostByVisibleAuthorId || ownsPostByMyPosts);

  const replyAvatarName = currentUserIsAnonymousPostAuthor ? anonymousDisplayName : currentUser?.full_name || "Member";
  const replyAvatarColor = currentUserIsAnonymousPostAuthor ? "#5C6470" : currentUser?.avatar_color || colorFromString(currentUser?.full_name || "Member");
  const replyPlaceholder = currentUserIsAnonymousPostAuthor ? `Reply as ${anonymousDisplayName}…` : "Write a reply...";

  const guard = (fn) => {
    if (requireAuth()) fn();
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (!next) return;

    setCommentsLoading(true);
    try {
      await loadCommentsForPost(post.id);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleReport = async () => {
    setMenuOpen(false);
    if (!requireAuth()) return;
    await reportPost(post.id);
  };

  const submitComment = async () => {
    if (commentSubmitting) return;
    setCommentError("");
    const cleanedComment = comment.trim();
    if (!cleanedComment) return;

    setCommentSubmitting(true);
    try {
      const mod = await moderateAsync(cleanedComment);
      if (!mod.allowed) {
        setCommentError(mod.reason || "Comment could not be posted.");
        return;
      }
      const result = await commentOnPost(post.id, cleanedComment);
      if (result?.ok === false) {
        setCommentError(result.error || "Could not post comment.");
        return;
      }
      setComment("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setCommentError("Could not post comment. Please try again.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <article className="group overflow-visible rounded-none border-x-0 border-t border-b-0 shadow-none transition-colors duration-200 md:border-x md:first:rounded-t-[18px] md:last:rounded-b-[18px]" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="px-4 md:px-5 pt-4 pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <ProfileIdentity href={authorProfileHref} name={displayName} color={displayColor} size={42} />
            <div className="min-w-0 flex-1">
              <ProfileIdentity href={authorProfileHref} name={displayName} color={displayColor}>
                <div className="text-[15px] font-bold leading-tight truncate hover:underline" style={{ color: T.text }}>{displayName}</div>
              </ProfileIdentity>
              <div className="mt-1 text-xs flex items-center gap-1.5 flex-wrap" style={{ color: T.textSubtle }}>
                {post.anonymous && <><span className="inline-flex items-center gap-1"><Lock size={10} strokeWidth={2.5} />anonymous</span><span>·</span></>}
                <ClientTimeAgo date={post.created_at} />
                {post.edited && <><span>·</span><span>edited</span></>}
                {cat?.label && cat.key !== "All" ? <><span>·</span><span>{cat.label}</span></> : null}
              </div>
            </div>
          </div>

          <div className="relative shrink-0" onBlur={() => setTimeout(() => setMenuOpen(false), 120)}>
            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="h-9 w-9 rounded-full inline-flex items-center justify-center transition-all active:scale-95" style={{ color: T.textSubtle, backgroundColor: menuOpen ? T.surface : "transparent" }} aria-label="Post options" aria-expanded={menuOpen}>
              <MoreHorizontal size={20} strokeWidth={2.4} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-2xl border shadow-lg" style={{ backgroundColor: T.card, borderColor: T.border, boxShadow: "0 16px 35px rgba(11,28,44,0.14)" }}>
                <button type="button" onClick={handleReport} className="w-full px-4 py-3 text-left text-sm font-semibold transition-colors" style={{ color: userReported ? T.textSubtle : T.text }}>
                  {userReported ? "Reported" : "Report post"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3.5">
          {post.title ? <h3 className="text-[18px] md:text-[21px] leading-snug font-bold tracking-[-0.015em]" style={{ color: T.text }}>{post.title}</h3> : null}
          {post.body ? <div className={post.title ? "mt-2" : ""}><ExpandableText text={post.body || ""} previewLength={POST_PREVIEW_LENGTH} className="text-[14px] md:text-[15px] leading-7 whitespace-pre-wrap max-w-none" style={{ color: T.text }} buttonSize="sm" /></div> : null}
        </div>

        {isReported ? <div className="mt-2.5 text-[11px] leading-4 font-semibold" style={{ color: T.textSubtle }}>Reported post under review.</div> : null}

        <div className="mt-3 border-t pt-1" style={{ borderColor: T.borderSoft }}>
          <div className="grid grid-cols-3 gap-1">
            <FeedActionButton icon={ArrowBigUp} label="Upvote" count={upvoteCount} active={userUpvoted} fillWhenActive onClick={() => guard(() => upvotePost(post.id))} />
            <FeedActionButton icon={MessageCircle} label="Reply" count={commentCount} active={showComments} onClick={toggleComments} />
            <FeedActionButton icon={Share2} label="Share" onClick={() => shareOrCopy(post, pushToast)} />
          </div>
        </div>
      </div>

      {showComments && (
        <div className="px-4 md:px-5 py-4" style={{ backgroundColor: T.surface, borderTop: `1px solid ${T.borderSoft}` }}>
          <div className="flex flex-col gap-3">
            {commentsLoading && <LoadingReplies />}

            {!commentsLoading && comments.length === 0 && <div className="text-sm text-center py-2" style={{ color: T.textSubtle }}>No comments yet. Start the conversation.</div>}

            {!commentsLoading && comments.map((c) => {
              const safeAuthor = getSafeCommentAuthor({ comment: c, post });
              const text = c.body ?? c.text ?? "";
              const commentHref = !safeAuthor.anonymous && safeAuthor.authorId ? `/users/${safeAuthor.authorId}` : null;
              return (
                <div key={c.id} className="flex gap-2.5">
                  <ProfileIdentity href={commentHref} name={safeAuthor.name} color={safeAuthor.color} size={32} />
                  <div className="flex-1 rounded-2xl px-3.5 py-2.5" style={{ backgroundColor: T.card }}>
                    <ProfileIdentity href={commentHref} name={safeAuthor.name} color={safeAuthor.color}>
                      <div className="text-[13px] font-bold hover:underline inline-flex items-center gap-1" style={{ color: T.text }}>{safeAuthor.anonymous && <Lock size={11} />}{safeAuthor.name}</div>
                    </ProfileIdentity>
                    <ExpandableText text={text} previewLength={COMMENT_PREVIEW_LENGTH} className="text-sm leading-6 whitespace-pre-wrap mt-1" style={{ color: T.textMuted }} buttonSize="xs" />
                  </div>
                </div>
              );
            })}

            <div className="flex gap-2.5 pt-1">
              <Avatar name={replyAvatarName} color={replyAvatarColor} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-end rounded-2xl border p-2" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
                  <textarea value={comment} onChange={(e) => { setComment(e.target.value); setCommentError(""); }} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitComment(); }} disabled={commentSubmitting} placeholder={replyPlaceholder} rows={1} className="flex-1 resize-none outline-none bg-transparent text-sm leading-6 max-h-28 min-h-[28px] disabled:opacity-70" style={{ color: T.text }} />
                  <Button variant="primary" size="sm" icon={Send} onClick={submitComment} disabled={commentSubmitting || !comment.trim()}>{commentSubmitting ? "Sending" : "Send"}</Button>
                </div>
                {commentError && <div className="text-xs mt-2" style={{ color: T.red }}>{commentError}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
