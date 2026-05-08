"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowBigUp,
  Edit3,
  Flag,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { colorFromString, shareOrCopy } from "@/lib/helpers";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditPostModal from "@/components/profile/EditPostModal";

const COMMENT_CACHE_PREFIX = "soldierhub_comments_cache_";

function getPostId(post) {
  return post?.post_id || post?.postId || post?.post?.id || post?.id || null;
}

function getCommentCacheKey(postId) {
  return `${COMMENT_CACHE_PREFIX}${postId}`;
}

function readCachedComments(postId) {
  if (typeof window === "undefined" || !postId) return [];

  try {
    const raw = window.localStorage.getItem(getCommentCacheKey(postId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.comments) ? parsed.comments : [];
  } catch {
    return [];
  }
}

function saveCachedComments(postId, comments) {
  if (typeof window === "undefined" || !postId || !Array.isArray(comments)) return;

  try {
    window.localStorage.setItem(
      getCommentCacheKey(postId),
      JSON.stringify({ savedAt: Date.now(), comments: comments.slice(-40) })
    );
  } catch {
    // Browser storage can fail in private mode or when full. Replies still work normally.
  }
}

function getAnonymousDisplayName(postId) {
  const source = String(postId || "anonymous");
  let total = 0;
  for (let i = 0; i < source.length; i += 1) total += source.charCodeAt(i) * (i + 1);
  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

function getCommentAuthorId(comment) {
  return (
    comment?.author_id ||
    comment?.user_id ||
    comment?.profile_id ||
    comment?.commenter_id ||
    comment?.created_by ||
    comment?.created_by_id ||
    comment?.author_user_id ||
    comment?.author?.id ||
    comment?.user?.id ||
    comment?.profile?.id ||
    null
  );
}

function getSafeCommentAuthor({ comment, post }) {
  const postId = getPostId(post);
  const anonymousName = getAnonymousDisplayName(postId);
  const authorId = getCommentAuthorId(comment);
  const postAuthorId = post?.author_id || post?.user_id || post?.profile_id || null;
  const isAnonymousPostAuthorComment =
    post?.anonymous &&
    (comment?.is_anonymous_author === true ||
      (authorId && postAuthorId && authorId === postAuthorId));

  if (isAnonymousPostAuthorComment) {
    return { name: anonymousName, color: "#5C6470", anonymous: true, authorId: null };
  }

  return {
    name:
      comment?.author_name_cached ||
      comment?.author?.full_name ||
      comment?.profile?.full_name ||
      comment?.user?.full_name ||
      comment?.author_name ||
      "Member",
    color:
      comment?.author_color_cached ||
      comment?.author?.avatar_color ||
      comment?.profile?.avatar_color ||
      comment?.user?.avatar_color ||
      comment?.author_color ||
      "#314A66",
    anonymous: false,
    authorId,
  };
}

function ProfileIdentity({ href, name, color, size = 42, children }) {
  if (!href) return children || <Avatar name={name} color={color} size={size} />;

  return (
    <Link
      href={href}
      className={
        children
          ? "inline-flex min-w-0 rounded-md outline-none focus-visible:underline"
          : "inline-flex min-w-0 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
      }
      style={children ? undefined : { "--tw-ring-color": T.blue }}
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
      style={{ color: active ? activeColor : inactiveColor, backgroundColor: "transparent" }}
    >
      <Icon
        size={18}
        className="shrink-0"
        strokeWidth={active ? 2.8 : 2.25}
        fill={active && fillWhenActive ? "currentColor" : "none"}
      />
      <span className="min-w-0 truncate">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          className={`shrink-0 text-[11px] leading-none ${active ? "font-extrabold" : "font-bold"}`}
          style={{ color: active ? activeColor : T.textSubtle }}
        >
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

function MenuButton({ children, icon: Icon, danger = false, muted = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-left text-sm font-semibold transition-colors flex items-center gap-2.5 hover:bg-black/[0.03]"
      style={{ color: danger ? "#B31942" : muted ? T.textSubtle : T.text }}
    >
      {Icon ? <Icon size={15} /> : null}
      <span>{children}</span>
    </button>
  );
}

export default function PostCard({ post }) {
  const {
    currentUser,
    requireAuth,
    pushToast,
    upvotePost,
    reportPost,
    commentOnPost,
    editMyPost,
    deleteMyPost,
    myUpvotes = new Set(),
    myReports = new Set(),
    myPosts = [],
    postComments = {},
    loadCommentsForPost,
  } = useApp();

  const postId = getPostId(post);
  const safePost = useMemo(
    () => ({ ...post, id: postId, post_id: post?.post_id || postId }),
    [post, postId]
  );

  const [showComments, setShowComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [cachedComments, setCachedComments] = useState(() => readCachedComments(postId));
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cat = CATEGORIES.find((c) => c.key === post?.category) || CATEGORIES[0];
  const userUpvoted = Boolean(currentUser && postId && myUpvotes?.has?.(postId));
  const userReported = Boolean(postId && myReports?.has?.(postId));
  const isReported = post?.status === "reported";
  const anonymousDisplayName = getAnonymousDisplayName(postId);
  const displayName = post?.anonymous ? anonymousDisplayName : post?.author_name || "Member";
  const displayColor = post?.anonymous
    ? "#5C6470"
    : post?.author_color || colorFromString(post?.author_name || "Member");
  const authorId = post?.author_id || post?.user_id || post?.profile_id || null;
  const authorProfileHref = !post?.anonymous && authorId ? `/users/${authorId}` : null;

  const comments = postId ? postComments[postId] || [] : [];
  const displayComments = comments.length > 0 ? comments : cachedComments;
  const commentCount = post?.comment_count ?? displayComments.length;
  const upvoteCount = post?.upvote_count ?? 0;

  useEffect(() => {
    if (!comments.length || !postId) return;
    setCachedComments(comments);
    saveCachedComments(postId, comments);
  }, [comments, postId]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuOpen]);

  const ownsPostBySafeViewerFlag = post?.viewer_is_author === true;
  const ownsPostByVisibleAuthorId = currentUser?.id && authorId && authorId === currentUser.id;
  const ownsPostByMyPosts =
    currentUser?.id &&
    postId &&
    Array.isArray(myPosts) &&
    myPosts.some((myPost) => getPostId(myPost) === postId);
  const ownsPost = Boolean(ownsPostBySafeViewerFlag || ownsPostByVisibleAuthorId || ownsPostByMyPosts);
  const currentUserIsAnonymousPostAuthor = Boolean(post?.anonymous) && ownsPost;

  const replyAvatarName = currentUserIsAnonymousPostAuthor ? anonymousDisplayName : currentUser?.full_name || "Member";
  const replyAvatarColor = currentUserIsAnonymousPostAuthor
    ? "#5C6470"
    : currentUser?.avatar_color || colorFromString(currentUser?.full_name || "Member");
  const replyPlaceholder = currentUserIsAnonymousPostAuthor
    ? `Reply as ${anonymousDisplayName}…`
    : "Write a reply...";

  const guard = (fn) => {
    if (requireAuth()) fn();
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (!next || !postId) return;

    if (comments.length > 0) return;

    if (cachedComments.length > 0) {
      loadCommentsForPost?.(postId).catch((error) => console.error("Failed to refresh cached replies:", error));
      return;
    }

    setCommentsLoading(true);
    try {
      await loadCommentsForPost?.(postId);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleReport = async () => {
    setMenuOpen(false);
    if (!requireAuth()) return;
    if (!postId) return pushToast?.("Post was not identified. Please refresh and try again.", "error");
    if (ownsPost) return pushToast?.("You cannot report your own post.", "info");
    if (userReported) return pushToast?.("You already reported this post.", "info");
    await reportPost?.(postId);
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    if (!ownsPost) return pushToast?.("You can only edit your own post.", "error");
    setEditingOpen(true);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    if (!ownsPost) return pushToast?.("You can only delete your own post.", "error");
    setDeletingOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleting) return;

    if (!postId) {
      pushToast?.("Post was not identified. Please refresh and try again.", "error");
      return;
    }

    setDeleting(true);

    try {
      const result = await deleteMyPost?.(postId);

      if (result?.ok !== true) {
        pushToast?.(result?.error || "Could not delete post.", "error");
        return;
      }

      setDeletingOpen(false);
      pushToast?.("Post deleted.", "success");
    } catch (error) {
      console.error("Failed to delete post:", error);
      pushToast?.("Could not delete post. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const submitComment = async () => {
    if (commentSubmitting) return;
    setCommentError("");

    if (!postId) {
      setCommentError("Post was not identified. Please refresh and try again.");
      return;
    }

    const cleanedComment = comment.trim();
    if (!cleanedComment) return;

    setCommentSubmitting(true);
    try {
      const mod = await moderateAsync(cleanedComment);
      if (!mod.allowed) {
        setCommentError(mod.reason || "Comment could not be posted.");
        return;
      }

      const result = await commentOnPost?.(postId, cleanedComment);
      if (result?.ok === false) {
        setCommentError(result.error || "Could not post comment.");
        return;
      }

      setComment("");
      await loadCommentsForPost?.(postId);
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setCommentError("Could not post comment. Please try again.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleEditSave = async (updates) => {
    if (!postId) return { ok: false, error: "Post was not identified. Please refresh and try again." };

    const result = await editMyPost?.(postId, updates);
    if (result?.ok !== false) setEditingOpen(false);
    return result;
  };

  const handleShare = async () => {
    if (!postId) return pushToast?.("Post link is not ready. Please refresh and try again.", "error");

    await shareOrCopy({
      title: post?.title || "SoldierHub post",
      text: post?.title || "SoldierHub post",
      url: `${window.location.origin}/?post=${encodeURIComponent(postId)}`,
      onCopied: () => pushToast?.("Post link copied.", "success"),
    });
  };

  return (
    <>
      <article
        className="group overflow-visible rounded-none border-x-0 border-t border-b-0 shadow-none transition-colors duration-200 md:border-x md:first:rounded-t-[18px] md:last:rounded-b-[18px]"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div className="px-4 md:px-5 pt-4 pb-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <ProfileIdentity href={authorProfileHref} name={displayName} color={displayColor} size={42} />

              <div className="min-w-0 flex-1">
                <ProfileIdentity href={authorProfileHref} name={displayName} color={displayColor}>
                  <div className="text-[15px] font-bold leading-tight truncate hover:underline" style={{ color: T.text }}>
                    {displayName}
                  </div>
                </ProfileIdentity>

                <div className="mt-1 text-xs flex items-center gap-1.5 flex-wrap" style={{ color: T.textSubtle }}>
                  {post?.anonymous ? <span>Anonymous</span> : null}
                  {isReported ? <span className="font-bold" style={{ color: "#B31942" }}>Post under review</span> : null}
                  <span>{cat?.label}</span>
                  <span>·</span>
                  <ClientTimeAgo date={post?.created_at} />
                  {post?.edited ? (
                    <>
                      <span>·</span>
                      <span>Edited</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="h-9 w-9 rounded-full flex items-center justify-center transition hover:bg-black/[0.04] active:scale-95"
                aria-label="Open post menu"
                style={{ color: T.textMuted }}
              >
                <MoreHorizontal size={20} />
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-10 z-40 w-44 overflow-hidden rounded-2xl border shadow-lg"
                  style={{ backgroundColor: T.card, borderColor: T.border }}
                >
                  {ownsPost ? (
                    <>
                      <MenuButton icon={Edit3} onClick={handleEditClick}>Edit</MenuButton>
                      <MenuButton icon={Trash2} danger onClick={handleDeleteClick}>Delete</MenuButton>
                    </>
                  ) : (
                    <MenuButton icon={Flag} danger={!userReported} muted={userReported} onClick={handleReport}>
                      {userReported ? "Reported" : "Report"}
                    </MenuButton>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 pl-0 md:pl-[54px]">
            {post?.title ? (
              <h3 className="text-[17px] md:text-lg font-extrabold tracking-[-0.02em]" style={{ color: T.text }}>
                {post.title}
              </h3>
            ) : null}

            <ExpandableText
              text={post?.body || ""}
              previewLength={280}
              className="mt-1 text-[15px] leading-7 whitespace-pre-wrap"
              style={{ color: T.textMuted }}
            />
          </div>
        </div>

        <div className="px-2 md:px-[70px] border-t" style={{ borderColor: T.border }}>
          <div className="grid grid-cols-4 gap-1 py-1">
            <FeedActionButton
              icon={ArrowBigUp}
              label="Upvote"
              count={upvoteCount}
              active={userUpvoted}
              fillWhenActive
              onClick={() => guard(() => upvotePost?.(postId))}
            />
            <FeedActionButton
              icon={MessageCircle}
              label="Reply"
              count={commentCount}
              active={showComments}
              onClick={toggleComments}
            />
            <FeedActionButton icon={Share2} label="Share" onClick={handleShare} />
            <FeedActionButton
              icon={Flag}
              label={userReported ? "Reported" : "Report"}
              active={userReported}
              onClick={() => guard(handleReport)}
            />
          </div>
        </div>

        {showComments ? (
          <div className="px-4 md:px-5 pb-4 border-t" style={{ borderColor: T.border }}>
            <div className="md:pl-[54px] pt-3 space-y-3">
              {commentsLoading ? <LoadingReplies /> : null}

              {displayComments.map((item) => {
                const commentAuthor = getSafeCommentAuthor({ comment: item, post: safePost });
                const commentKey = item?.id || item?.comment_id || `${postId}-${item?.created_at || item?.body}`;

                return (
                  <div key={commentKey} className="flex items-start gap-2.5">
                    <Avatar name={commentAuthor.name} color={commentAuthor.color} size={32} />
                    <div className="min-w-0 flex-1 rounded-2xl px-3 py-2" style={{ backgroundColor: "#F4F7FA" }}>
                      <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold" style={{ color: T.text }}>
                        <span>{commentAuthor.name}</span>
                        <span style={{ color: T.textSubtle }}>·</span>
                        <span style={{ color: T.textSubtle }}>
                          <ClientTimeAgo date={item?.created_at} />
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm leading-6 whitespace-pre-wrap" style={{ color: T.textMuted }}>
                        {item?.body || item?.content || ""}
                      </p>
                    </div>
                  </div>
                );
              })}

              {displayComments.length === 0 && !commentsLoading ? (
                <p className="text-sm" style={{ color: T.textSubtle }}>No replies yet. Be the first to reply.</p>
              ) : null}

              {currentUser ? (
                <div className="flex items-start gap-2.5 pt-1">
                  <Avatar name={replyAvatarName} color={replyAvatarColor} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: T.border, backgroundColor: "#F8FAFC" }}>
                      <input
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            submitComment();
                          }
                        }}
                        placeholder={replyPlaceholder}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        style={{ color: T.text }}
                      />
                      <button
                        type="button"
                        onClick={submitComment}
                        disabled={commentSubmitting || !comment.trim()}
                        className="h-8 w-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                        style={{ backgroundColor: T.navy, color: "white" }}
                        aria-label="Post reply"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                    {commentError ? (
                      <p className="mt-1 text-xs font-semibold" style={{ color: "#B31942" }}>{commentError}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => requireAuth()}
                  className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ borderColor: T.border, color: T.textMuted, backgroundColor: "#F8FAFC" }}
                >
                  <Lock size={15} />
                  Sign in to reply
                </button>
              )}
            </div>
          </div>
        ) : null}
      </article>

      {editingOpen ? (
        <EditPostModal post={safePost} onClose={() => setEditingOpen(false)} onSave={handleEditSave} />
      ) : null}

      {deletingOpen ? (
        <ConfirmDialog
          open={deletingOpen}
          title="Delete post?"
          body="This will permanently delete this post and its related activity from SoldierHub. This action cannot be undone."
          confirmText={deleting ? "Deleting..." : "Delete"}
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            if (!deleting) setDeletingOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
