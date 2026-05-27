"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowBigUp,
  Download,
  Edit3,
  Flag,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { colorFromString } from "@/lib/helpers";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditPostModal from "@/components/profile/EditPostModal";
import ProfileIdentityLink from "@/components/ui/ProfileIdentityLink";

const pendingReplyPostIds = new Set();

function getPostId(post) {
  return post?.id || post?.postId || post?.post?.id || post?.post_id || null;
}

function getCommentId(comment) {
  return comment?.id || comment?.comment_id || comment?.commentId || null;
}

function isTemporaryCommentId(commentId) {
  return typeof commentId === "string" && commentId.startsWith("temp-");
}

function getAuthorId(item) {
  return (
    item?.author_id ||
    item?.author_user_id ||
    item?.comment_author_id ||
    item?.comment_author_user_id ||
    item?.commenter_id ||
    item?.commenter_user_id ||
    item?.actor_user_id ||
    item?.actor_id ||
    item?.user_id ||
    item?.profile_id ||
    item?.created_by ||
    item?.created_by_id ||
    item?.owner_id ||
    item?.profile?.id ||
    item?.author?.id ||
    item?.user?.id ||
    item?.commenter?.id ||
    item?.actor?.id ||
    null
  );
}

function viewerOwnsComment(comment = {}, currentUser) {
  const authorId = getAuthorId(comment);

  return Boolean(
    currentUser?.id &&
      (authorId === currentUser.id ||
        comment?.viewer_is_author === true ||
        comment?.viewer_is_owner === true ||
        comment?.viewer_owns_comment === true ||
        comment?.viewer_can_delete === true ||
        comment?.can_delete === true ||
        comment?.is_mine === true)
  );
}

function getDisplayName(item, fallback = "Member") {
  return (
    item?.author_name_cached ||
    item?.author_name ||
    item?.comment_author_name ||
    item?.commenter_name ||
    item?.profile_full_name ||
    item?.full_name ||
    item?.profile?.full_name ||
    item?.author?.full_name ||
    item?.user?.full_name ||
    item?.commenter?.full_name ||
    item?.actor?.full_name ||
    fallback
  );
}

function getDisplayColor(item, name) {
  return (
    item?.author_color_cached ||
    item?.author_color ||
    item?.comment_author_color ||
    item?.commenter_color ||
    item?.profile_avatar_color ||
    item?.avatar_color ||
    item?.profile?.avatar_color ||
    item?.author?.avatar_color ||
    item?.user?.avatar_color ||
    item?.commenter?.avatar_color ||
    item?.actor?.avatar_color ||
    colorFromString(name)
  );
}

function getDisplayAvatarUrl(item) {
  return (
    item?.author_avatar_url_cached ||
    item?.author_avatar_url ||
    item?.comment_author_avatar_url ||
    item?.commenter_avatar_url ||
    item?.profile_avatar_url ||
    item?.avatar_url ||
    item?.profile?.avatar_url ||
    item?.author?.avatar_url ||
    item?.user?.avatar_url ||
    item?.commenter?.avatar_url ||
    item?.actor?.avatar_url ||
    null
  );
}

function getPostCreatedAt(post) {
  return post?.created_at || post?.createdAt || post?.inserted_at || post?.timestamp || post?.date || null;
}

function getPostUpdatedAt(post) {
  return post?.updated_at || post?.updatedAt || post?.edited_at || post?.editedAt || post?.modified_at || post?.modifiedAt || null;
}

function isPostEdited(post) {
  if (post?.edited === true || post?.is_edited === true) return true;

  const createdAt = getPostCreatedAt(post);
  const updatedAt = getPostUpdatedAt(post);
  if (!createdAt || !updatedAt) return false;

  const createdMs = new Date(createdAt).getTime();
  const updatedMs = new Date(updatedAt).getTime();
  if (!Number.isFinite(createdMs) || !Number.isFinite(updatedMs)) return false;

  return updatedMs - createdMs > 30000;
}

function getAnonymousDisplayName(postId) {
  const source = String(postId || "anonymous");
  let total = 0;
  for (let i = 0; i < source.length; i += 1) total += source.charCodeAt(i) * (i + 1);
  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

function getPostUrl(postId) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/post/${encodeURIComponent(postId)}`;
}

function getPostImage(post) {
  const fullUrl = post?.image_full_url || post?.imageFullUrl || post?.image_url || post?.imageUrl || post?.media_url || post?.mediaUrl || null;
  const previewUrl = post?.image_thumbnail_url || post?.imageThumbnailUrl || post?.thumbnail_url || post?.thumbnailUrl || post?.image_url || post?.imageUrl || post?.media_url || post?.mediaUrl || null;
  if (!previewUrl && !fullUrl) return null;

  return {
    url: previewUrl || fullUrl,
    fullUrl: fullUrl || previewUrl,
    width: Number(post?.image_thumbnail_width || post?.imageThumbnailWidth || post?.thumbnail_width || post?.image_width || post?.imageWidth || 0) || null,
    height: Number(post?.image_thumbnail_height || post?.imageThumbnailHeight || post?.thumbnail_height || post?.image_height || post?.imageHeight || 0) || null,
    size: Number(post?.image_thumbnail_size || post?.imageThumbnailSize || post?.thumbnail_size || post?.image_size || post?.imageSize || 0) || null,
    fullWidth: Number(post?.image_full_width || post?.imageFullWidth || post?.image_width || post?.imageWidth || 0) || null,
    fullHeight: Number(post?.image_full_height || post?.imageFullHeight || post?.image_height || post?.imageHeight || 0) || null,
    fullSize: Number(post?.image_full_size || post?.imageFullSize || post?.image_size || post?.imageSize || 0) || null,
  };
}

function getImageRatio(image) {
  if (!image?.width || !image?.height) return null;
  return image.width / image.height;
}

function getDownloadFileName(url = "") {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    if (name && name.includes(".")) return name;
  } catch {
    // Keep the safe fallback below when the URL cannot be parsed.
  }

  return "soldierhub-post-image.jpg";
}

function PostImagePreview({ image, onOpen }) {
  const ratio = getImageRatio(image);
  const isVeryTall = ratio ? ratio < 0.58 : false;
  const aspectRatio = ratio ? `${image.width} / ${image.height}` : "16 / 10";

  return (
    <button
      type="button"
      onClick={() => onOpen?.(image)}
      className="mt-4 block w-full overflow-hidden rounded-[22px] border text-left transition active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-[#3F5F7D]/25"
      style={{
        borderColor: T.borderSoft || T.border,
        backgroundColor: "#F4F8FD",
        height: isVeryTall ? "clamp(260px, 46vh, 430px)" : undefined,
        aspectRatio: isVeryTall ? undefined : aspectRatio,
        maxHeight: isVeryTall ? "430px" : "620px",
      }}
      aria-label="Open post image"
    >
      <img
        src={image.url}
        alt="Post attachment"
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover"
        style={{ objectPosition: isVeryTall ? "top center" : "center center" }}
      />
    </button>
  );
}

function PostImageLightbox({ image, onClose }) {
  const displayUrl = image?.fullUrl || image?.url;
  const fullImage = {
    ...image,
    width: image?.fullWidth || image?.width,
    height: image?.fullHeight || image?.height,
    size: image?.fullSize || image?.size,
  };
  const ratio = getImageRatio(fullImage);
  const isLongImage = ratio ? ratio < 0.7 : false;
  const fileName = getDownloadFileName(displayUrl);

  useEffect(() => {
    if (!displayUrl || typeof window === "undefined") return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [displayUrl, onClose]);

  if (!displayUrl) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 text-white" role="dialog" aria-modal="true" aria-label="Post image viewer">
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-[10001] flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/18 active:scale-95"
          aria-label="Close image viewer"
        >
          <X size={21} />
        </button>

        <a
          href={displayUrl}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="pointer-events-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18 active:scale-95"
          aria-label="Download image"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>

      <div
        className="h-full overflow-auto px-0 pb-5 pt-[72px] overscroll-contain sm:px-4 sm:pb-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <div className={isLongImage ? "min-h-full" : "flex min-h-full items-center justify-center"}>
          <img
            src={displayUrl}
            alt="Full size post attachment"
            className={isLongImage ? "mx-auto block w-full max-w-[720px] object-contain" : "mx-auto block max-h-[calc(100dvh-110px)] max-w-full object-contain"}
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, count, active = false, onClick, fillWhenActive = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 min-w-0 rounded-full px-3 text-xs md:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] hover:bg-black/[0.04] disabled:pointer-events-none disabled:opacity-60"
      style={{
        color: active ? T.navy : T.textMuted,
        backgroundColor: active ? "rgba(11,28,44,0.07)" : "transparent",
      }}
    >
      <Icon size={18} className="shrink-0" strokeWidth={active ? 2.8 : 2.25} fill={active && fillWhenActive ? "currentColor" : "none"} />
      <span className="truncate">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[11px] font-extrabold leading-none">{count > 99 ? "99+" : count}</span>
      ) : null}
    </button>
  );
}

function MenuButton({ children, icon: Icon, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-left text-sm font-semibold transition-colors flex items-center gap-2.5 hover:bg-black/[0.035]"
      style={{ color: danger ? "#B31942" : T.text }}
    >
      {Icon ? <Icon size={15} /> : null}
      <span>{children}</span>
    </button>
  );
}

function AuthorAvatarName({ post, displayName, displayColor, displayAvatarUrl, authorId }) {
  const content = (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar name={displayName} color={displayColor} avatarUrl={displayAvatarUrl} size="sm" />
      <span className="font-semibold truncate" style={{ color: T.text }}>
        {displayName}
      </span>
    </div>
  );

  if (post?.anonymous || !authorId) return content;

  return (
    <ProfileIdentityLink
      userId={authorId}
      fallbackName={displayName}
      className="min-w-0 cursor-pointer rounded-full transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4E8C]/25"
    >
      {content}
    </ProfileIdentityLink>
  );
}

export default function PostCard({ post, openRepliesDefault = false }) {
  const {
    currentUser,
    requireAuth,
    pushToast,
    upvotePost,
    reportPost,
    commentOnPost,
    deleteComment: deleteCommentAction,
    editMyPost,
    deleteMyPost,
    adminDeletePost,
    isAdmin,
    myUpvotes = new Set(),
    myReports = new Set(),
    myPosts = [],
    postComments = {},
    loadCommentsForPost,
  } = useApp();

  const postId = getPostId(post);
  const postCreatedAt = getPostCreatedAt(post);
  const postUpdatedAt = getPostUpdatedAt(post);
  const editedPost = isPostEdited(post);
  const safePost = useMemo(() => ({ ...post, id: postId, post_id: postId }), [post, postId]);
  const [showComments, setShowComments] = useState(Boolean(openRepliesDefault));
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [upvoteSubmitting, setUpvoteSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentMenuOpenId, setCommentMenuOpenId] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const upvotePendingRef = useRef(false);
  const lastLocalUpvoteMutationRef = useRef(0);
  const lastUpvotePostIdRef = useRef(postId);

  const category = CATEGORIES.find((c) => c.key === post?.category) || CATEGORIES[0];
  const authorId = getAuthorId(post);
  const anonymousName = getAnonymousDisplayName(postId);
  const displayName = post?.anonymous ? anonymousName : getDisplayName(post, "Member");
  const displayColor = post?.anonymous ? "#5C6470" : getDisplayColor(post, displayName);
  const displayAvatarUrl = post?.anonymous ? null : getDisplayAvatarUrl(post);
  const comments = postId ? postComments?.[postId] || [] : [];
  const commentsLoaded = Boolean(postId && Object.prototype.hasOwnProperty.call(postComments || {}, postId));
  const storedCommentCount = post?.comment_count ?? post?.reply_count ?? 0;
  const commentCount = commentsLoaded ? comments.length : storedCommentCount;
  const storedUpvoteCount = Number(post?.upvote_count ?? 0) || 0;
  const userUpvotedFromStore = Boolean(currentUser && postId && myUpvotes?.has?.(postId));
  const [optimisticUpvoteCount, setOptimisticUpvoteCount] = useState(storedUpvoteCount);
  const [optimisticUserUpvoted, setOptimisticUserUpvoted] = useState(userUpvotedFromStore);
  const upvoteCount = optimisticUpvoteCount;
  const userUpvoted = optimisticUserUpvoted;
  const userReported = Boolean(postId && myReports?.has?.(postId));
  const isReported = post?.status === "reported";
  const ownsPost = Boolean(
    (currentUser?.id && authorId && currentUser.id === authorId) ||
      post?.viewer_is_author === true ||
      (currentUser?.id && postId && Array.isArray(myPosts) && myPosts.some((myPost) => getPostId(myPost) === postId))
  );
  const adminModeratingOtherPost = Boolean(isAdmin && !ownsPost);
  const shouldMaskViewerReply = Boolean(post?.anonymous && ownsPost);
  const replyName = shouldMaskViewerReply ? anonymousName : currentUser?.full_name || "Member";
  const replyColor = shouldMaskViewerReply ? "#5C6470" : currentUser?.avatar_color || colorFromString(replyName);
  const replyAvatarUrl = shouldMaskViewerReply ? null : currentUser?.avatar_url || null;
  const bodyText = post?.body || post?.content || post?.text || "";
  const postImage = getPostImage(post);

  useEffect(() => {
    setShowComments(Boolean(openRepliesDefault));
    setComment("");
    setCommentError("");
    setCommentsLoading(false);
    setCommentSubmitting(false);
    setUpvoteSubmitting(false);
    setCommentMenuOpenId(null);
    setCommentToDelete(null);
    setActiveImage(null);
    upvotePendingRef.current = false;
    lastLocalUpvoteMutationRef.current = 0;
    lastUpvotePostIdRef.current = postId;
  }, [postId, openRepliesDefault]);

  useEffect(() => {
    if (lastUpvotePostIdRef.current !== postId) {
      lastUpvotePostIdRef.current = postId;
      setOptimisticUpvoteCount(storedUpvoteCount);
      setOptimisticUserUpvoted(userUpvotedFromStore);
      return;
    }

    if (upvotePendingRef.current) return;
    if (Date.now() - lastLocalUpvoteMutationRef.current < 3000) return;

    setOptimisticUpvoteCount(storedUpvoteCount);
    setOptimisticUserUpvoted(userUpvotedFromStore);
  }, [postId, storedUpvoteCount, userUpvotedFromStore]);

  useEffect(() => {
    if (!openRepliesDefault || !postId || commentsLoaded) return undefined;

    let cancelled = false;
    setShowComments(true);
    setCommentsLoading(true);

    (async () => {
      try {
        const result = await loadCommentsForPost?.(postId);
        if (result?.source === "cache" && !cancelled) return;
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openRepliesDefault, postId, commentsLoaded, loadCommentsForPost]);

  useEffect(() => {
    if (!menuOpen && !commentMenuOpenId) return undefined;

    const closeMenu = () => {
      setMenuOpen(false);
      setCommentMenuOpenId(null);
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuOpen, commentMenuOpenId]);

  const ensurePostId = () => {
    if (postId) return true;
    pushToast?.("Post was not identified. Please refresh and try again.", "error");
    return false;
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (!next || !postId || commentsLoaded) return;

    setCommentsLoading(true);
    try {
      const result = await loadCommentsForPost?.(postId);
      if (result?.source === "cache") return;
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (upvotePendingRef.current || upvoteSubmitting) return;
    if (!requireAuth()) return;
    if (!ensurePostId()) return;

    const wasUpvoted = optimisticUserUpvoted;
    const nextUserUpvoted = !wasUpvoted;
    const delta = wasUpvoted ? -1 : 1;

    upvotePendingRef.current = true;
    lastLocalUpvoteMutationRef.current = Date.now();
    setUpvoteSubmitting(true);
    setOptimisticUserUpvoted(nextUserUpvoted);
    setOptimisticUpvoteCount((count) => Math.max((Number(count) || 0) + delta, 0));

    try {
      const result = await upvotePost?.(postId);

      if (result?.ok === false) {
        setOptimisticUserUpvoted(wasUpvoted);
        setOptimisticUpvoteCount((count) => Math.max((Number(count) || 0) - delta, 0));
        return;
      }

      const authoritativeUserUpvoted =
        typeof result?.user_upvoted === "boolean" ? result.user_upvoted : nextUserUpvoted;
      const authoritativeCount = Number(result?.upvote_count);

      setOptimisticUserUpvoted(authoritativeUserUpvoted);
      if (Number.isFinite(authoritativeCount)) {
        setOptimisticUpvoteCount(Math.max(authoritativeCount, 0));
      }
    } catch {
      setOptimisticUserUpvoted(wasUpvoted);
      setOptimisticUpvoteCount((count) => Math.max((Number(count) || 0) - delta, 0));
      pushToast?.("Could not update upvote. Please try again.", "error");
    } finally {
      upvotePendingRef.current = false;
      lastLocalUpvoteMutationRef.current = Date.now();
      setUpvoteSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!ensurePostId()) return;
    const url = getPostUrl(postId);
    const title = "SoldierHub post";
    const text = "View this SoldierHub community post.";

    if (navigator?.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled share or the device share sheet failed. Do not show an error.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      pushToast?.("Post link copied", "success");
    } catch {
      // Clipboard may be blocked on some browsers. Keep the UI quiet instead of showing a scary error.
    }
  };

  const handleReport = async () => {
    setMenuOpen(false);
    if (!requireAuth()) return;
    if (!ensurePostId()) return;
    if (ownsPost) return pushToast?.("You cannot report your own post.", "info");
    if (userReported) return pushToast?.("You already reported this post.", "info");
    await reportPost?.(postId);
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    if (!ensurePostId()) return;
    if (!ownsPost) return pushToast?.("You can only edit your own post.", "error");
    setEditingOpen(true);
  };

  const handleEditSave = async (updates) => {
    if (!postId) return { ok: false, error: "Post was not identified. Please refresh and try again." };
    const result = await editMyPost?.(postId, updates);
    if (result?.ok !== false) setEditingOpen(false);
    return result;
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    if (!ensurePostId()) return;
    if (!ownsPost && !isAdmin) return pushToast?.("You can only delete your own post.", "error");
    setDeletingOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleting || !ensurePostId()) return;
    setDeleting(true);
    try {
      const result = adminModeratingOtherPost ? await adminDeletePost?.(postId) : await deleteMyPost?.(postId);

      if (result?.ok === false) return pushToast?.(result?.error || "Could not delete post.", "error");
      setDeletingOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCommentConfirm = async () => {
    const commentId = getCommentId(commentToDelete);

    if (deletingComment || !postId || !commentId) return;

    if (isTemporaryCommentId(commentId)) {
      setCommentToDelete(null);
      pushToast?.("Please wait until the reply finishes posting.", "info");
      return;
    }

    setDeletingComment(true);
    try {
      const result = await deleteCommentAction?.({ postId, commentId });

      if (result?.ok === false) return pushToast?.(result?.error || "Could not delete comment.", "error");
      setCommentToDelete(null);
    } finally {
      setDeletingComment(false);
    }
  };

  const submitComment = async () => {
    const pendingKey = postId || "unknown-post";

    if (commentSubmitting || pendingReplyPostIds.has(pendingKey)) return;
    setCommentError("");
    if (!requireAuth()) return;
    if (!postId) return setCommentError("Post was not identified. Please refresh and try again.");

    const cleaned = comment.trim();
    if (!cleaned) return;

    pendingReplyPostIds.add(pendingKey);
    setCommentSubmitting(true);
    setShowComments(true);
    setComment("");

    try {
      const mod = await moderateAsync(cleaned);
      if (!mod.allowed) {
        setComment(cleaned);
        setCommentError(mod.reason || "Comment could not be posted.");
        return;
      }

      const result = await commentOnPost?.(postId, cleaned, {
        isAnonymousAuthor: shouldMaskViewerReply,
        maskOptimisticIdentity: shouldMaskViewerReply,
        anonymousName,
        anonymousColor: "#5C6470",
      });

      if (result?.ok === false) {
        setComment(cleaned);
        setCommentError(result.error || "Could not post comment.");
      }
    } catch {
      setComment(cleaned);
      setCommentError("Could not post comment. Please try again.");
    } finally {
      pendingReplyPostIds.delete(pendingKey);
      setCommentSubmitting(false);
    }
  };

  if (!postId) return null;

  return (
    <>
      <article
        className="relative overflow-visible rounded-[26px] border bg-white shadow-sm scroll-mt-28 md:scroll-mt-32"
        style={{ borderColor: T.border }}
        data-post-id={postId}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: T.muted }}>
                <AuthorAvatarName
                  post={safePost}
                  displayName={displayName}
                  displayColor={displayColor}
                  displayAvatarUrl={displayAvatarUrl}
                  authorId={authorId}
                />
                <span>•</span>
                <ClientTimeAgo value={postCreatedAt} />
                {editedPost ? (
                  <>
                    <span>•</span>
                    <span>Edited</span>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: category.bg, color: category.color }}
                >
                  {category.label}
                </span>
                {post?.anonymous ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    <Lock size={12} /> Anonymous
                  </span>
                ) : null}
                {isReported ? (
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                    Under review
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                className="h-9 w-9 rounded-full flex items-center justify-center transition hover:bg-slate-100"
                style={{ color: T.muted }}
                aria-label="Post options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={20} />
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-2xl border bg-white shadow-xl"
                  style={{ borderColor: T.border }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {ownsPost ? <MenuButton icon={Edit3} onClick={handleEditClick}>Edit post</MenuButton> : null}
                  {ownsPost || isAdmin ? <MenuButton icon={Trash2} danger onClick={handleDeleteClick}>{isAdmin && !ownsPost ? "Delete as admin" : "Delete post"}</MenuButton> : null}
                  {!ownsPost ? <MenuButton icon={Flag} danger onClick={handleReport}>{userReported ? "Already reported" : "Report post"}</MenuButton> : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <ExpandableText html={bodyText} />
            {postImage ? <PostImagePreview image={postImage} onOpen={setActiveImage} /> : null}
          </div>
        </div>

        <div className="mx-2 flex items-center justify-between border-t px-2 py-2" style={{ borderColor: T.border }}>
          <ActionButton
            icon={ArrowBigUp}
            label="Upvote"
            count={upvoteCount}
            active={userUpvoted}
            fillWhenActive
            onClick={handleUpvote}
            disabled={upvoteSubmitting}
          />
          <ActionButton icon={MessageCircle} label="Reply" count={commentCount} active={showComments} onClick={handleToggleComments} />
          <ActionButton icon={Share2} label="Share" onClick={handleShare} />
        </div>

        {showComments ? (
          <div className="border-t px-4 py-3" style={{ borderColor: T.border }}>
            {commentsLoading ? (
              <div className="py-2 text-sm font-medium" style={{ color: T.muted }}>
                Loading replies...
              </div>
            ) : comments.length ? (
              <div className="mb-3 space-y-3">
                {comments.map((c) => {
                  const commentId = getCommentId(c) || `${postId}-${c.created_at}-${getDisplayName(c, "Member")}`;
                  const commentName = shouldMaskViewerReply && viewerOwnsComment(c, currentUser) ? anonymousName : getDisplayName(c, "Member");
                  const commentColor = shouldMaskViewerReply && viewerOwnsComment(c, currentUser) ? "#5C6470" : getDisplayColor(c, commentName);
                  const commentAvatarUrl = shouldMaskViewerReply && viewerOwnsComment(c, currentUser) ? null : getDisplayAvatarUrl(c);
                  const commentAuthorId = getAuthorId(c);
                  const canDeleteComment = viewerOwnsComment(c, currentUser) || isAdmin;

                  return (
                    <div key={commentId} className="flex gap-2 text-sm">
                      <Avatar name={commentName} color={commentColor} avatarUrl={commentAvatarUrl} size="xs" />
                      <div className="min-w-0 flex-1 rounded-2xl px-3 py-2" style={{ backgroundColor: "#F6F8FB" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <ProfileIdentityLink
                              userId={commentAuthorId}
                              fallbackName={commentName}
                              className="font-semibold hover:opacity-85 focus:outline-none"
                              style={{ color: T.text }}
                            >
                              {commentName}
                            </ProfileIdentityLink>
                            <p className="whitespace-pre-wrap break-words" style={{ color: T.textMuted }}>
                              {c.body}
                            </p>
                          </div>

                          {canDeleteComment ? (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCommentMenuOpenId((openId) => (openId === commentId ? null : commentId));
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                aria-label="Comment options"
                                aria-expanded={commentMenuOpenId === commentId}
                              >
                                <MoreHorizontal size={15} />
                              </button>

                              {commentMenuOpenId === commentId ? (
                                <div
                                  className="absolute right-0 top-8 z-30 w-40 overflow-hidden rounded-2xl border bg-white shadow-xl"
                                  style={{ borderColor: T.border }}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <MenuButton
                                    icon={Trash2}
                                    danger
                                    onClick={() => {
                                      setCommentMenuOpenId(null);
                                      setCommentToDelete(c);
                                    }}
                                  >
                                    Delete reply
                                  </MenuButton>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mb-3 text-sm" style={{ color: T.muted }}>
                No replies yet.
              </div>
            )}

            <div className="flex gap-2">
              <Avatar name={replyName} color={replyColor} avatarUrl={replyAvatarUrl} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                    placeholder="Write a reply..."
                    disabled={commentSubmitting}
                    className="min-w-0 flex-1 rounded-full border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1E4E8C]/20 disabled:cursor-wait disabled:bg-slate-50"
                    style={{ borderColor: T.border }}
                  />
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={commentSubmitting || !comment.trim()}
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: T.primary }}
                    aria-label="Send reply"
                  >
                    <Send size={17} />
                  </button>
                </div>
                {commentError ? (
                  <p className="mt-2 text-xs font-semibold text-rose-600">{commentError}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <EditPostModal open={editingOpen} post={safePost} onClose={() => setEditingOpen(false)} onSave={handleEditSave} />

      <ConfirmDialog
        open={deletingOpen}
        title={adminModeratingOtherPost ? "Delete this post as admin?" : "Delete this post?"}
        message={adminModeratingOtherPost ? "This will permanently remove the post from the community feed." : "This will permanently remove your post from the community feed."}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => (deleting ? null : setDeletingOpen(false))}
      />

      <ConfirmDialog
        open={Boolean(commentToDelete)}
        title="Delete this reply?"
        message="This will permanently remove the reply from the post."
        confirmLabel={deletingComment ? "Deleting..." : "Delete"}
        danger
        onConfirm={handleDeleteCommentConfirm}
        onCancel={() => (deletingComment ? null : setCommentToDelete(null))}
      />

      {activeImage ? <PostImageLightbox image={activeImage} onClose={() => setActiveImage(null)} /> : null}
    </>
  );
}
