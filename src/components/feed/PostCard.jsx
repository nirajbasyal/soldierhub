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
  return `${window.location.origin}/?post=${encodeURIComponent(postId)}`;
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

function PostImagePreview({ image, onOpen, alt }) {
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
      aria-label={alt ? `Open image: ${alt}` : "Open post image"}
    >
      <img
        src={image.url}
        srcSet={
          image.fullUrl && image.fullUrl !== image.url && image.width && image.fullWidth
            ? `${image.url} ${image.width}w, ${image.fullUrl} ${image.fullWidth}w`
            : undefined
        }
        sizes={
          image.fullUrl && image.fullUrl !== image.url && image.width && image.fullWidth
            ? "(max-width: 640px) 100vw, 640px"
            : undefined
        }
        width={image.width || undefined}
        height={image.height || undefined}
        alt={alt || "Image attached to this post"}
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover"
        style={{ objectPosition: isVeryTall ? "top center" : "center center" }}
      />
    </button>
  );
}

function PostImageLightbox({ image, onClose, alt }) {
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
            alt={alt ? `Full size image: ${alt}` : "Full size image attached to this post"}
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

function AuthorAvatarName({ userId, fallbackName = "", name, color, src, size, anonymous = false, children }) {
  if (anonymous || !userId) {
    return children || <Avatar name={name} color={color} src={anonymous ? null : src} size={size} />;
  }

  return (
    <ProfileIdentityLink userId={userId} fallbackName={fallbackName || name} className="inline-flex cursor-pointer transition hover:opacity-80 focus:outline-none">
      {children || <Avatar name={name} color={color} src={src} size={size} />}
    </ProfileIdentityLink>
  );
}

function CommentRow({ comment, post, currentUser, isAdmin = false, menuOpen = false, onToggleMenu, onDeleteRequest }) {
  const postId = getPostId(post);
  const postAuthorId = getAuthorId(post);
  const commentId = getCommentId(comment);
  const commentAuthorId = getAuthorId(comment);
  const anonymousName = getAnonymousDisplayName(postId);
  const anonymousAuthor = Boolean(
    comment?.is_anonymous_author === true ||
      comment?.anonymous === true ||
      comment?.comment_anonymous === true ||
      comment?.mask_optimistic_identity === true ||
      (post?.anonymous && commentAuthorId && postAuthorId && commentAuthorId === postAuthorId) ||
      (post?.anonymous && comment?.viewer_is_author === true && !commentAuthorId)
  );
  const name = anonymousAuthor ? anonymousName : getDisplayName(comment, "Member");
  const color = anonymousAuthor ? "#5C6470" : getDisplayColor(comment, name);
  const avatarUrl = anonymousAuthor ? null : getDisplayAvatarUrl(comment);
  const isMine = viewerOwnsComment(comment, currentUser);
  const isReplyingComment = isTemporaryCommentId(commentId);
  const canDeleteComment = Boolean(commentId && !isReplyingComment && currentUser?.id && (isAdmin || isMine));

  return (
    <div className="group flex items-start gap-2.5">
      <AuthorAvatarName userId={anonymousAuthor ? null : commentAuthorId} fallbackName={name} name={name} color={color} src={avatarUrl} size={30} anonymous={anonymousAuthor}>
        <Avatar name={name} color={color} src={avatarUrl} size={30} />
      </AuthorAvatarName>
      <div className="min-w-0 flex-1">
        <div className="relative min-w-0 rounded-2xl px-3 py-2 pr-10" style={{ backgroundColor: "rgba(244,248,253,0.95)" }}>
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold" style={{ color: T.text }}>
            {anonymousAuthor ? <Lock size={11} className="shrink-0" /> : null}
            <AuthorAvatarName userId={anonymousAuthor ? null : commentAuthorId} fallbackName={name} name={name} color={color} src={avatarUrl} size={30} anonymous={anonymousAuthor}>
              <span className={anonymousAuthor || !commentAuthorId ? "truncate" : "truncate cursor-pointer transition hover:opacity-80"}>{name}</span>
            </AuthorAvatarName>
            {isMine ? <span className="shrink-0" style={{ color: T.textSubtle }}>(you)</span> : null}
            {isReplyingComment ? <span className="shrink-0" style={{ color: T.textSubtle }}>Replying…</span> : null}
          </div>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6" style={{ color: T.textMuted }}>
            {comment?.body || comment?.content || comment?.text || ""}
          </p>

          {canDeleteComment ? (
            <div className="absolute right-1.5 top-1.5 z-20">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleMenu?.(commentId);
                }}
                className="h-7 w-7 rounded-full flex items-center justify-center opacity-70 transition hover:bg-black/[0.05] hover:opacity-100"
                style={{ color: T.textMuted }}
                aria-label="Comment options"
              >
                <MoreHorizontal size={16} />
              </button>

              {menuOpen ? (
                <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: T.card, borderColor: T.border }}>
                  <MenuButton icon={Trash2} danger onClick={() => onDeleteRequest?.(comment)}>
                    Delete comment
                  </MenuButton>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
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

  const imageAlt = (() => {
    const fromBody = String(bodyText || "").replace(/\s+/g, " ").trim();
    if (fromBody) return fromBody.length > 120 ? `${fromBody.slice(0, 119).trimEnd()}…` : fromBody;
    const categoryLabel = category?.label || post?.category || "community";
    return `${categoryLabel} post by ${displayName}`;
  })();

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

    if (navigator?.share) {
      try {
        await navigator.share({ url });
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
      <article className="group overflow-visible rounded-[22px] border shadow-sm transition-colors duration-200 md:rounded-[24px]" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <div className="px-4 md:px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <AuthorAvatarName userId={authorId} fallbackName={displayName} name={displayName} color={displayColor} src={displayAvatarUrl} size={42} anonymous={post?.anonymous}>
                <Avatar name={displayName} color={displayColor} src={displayAvatarUrl} size={42} />
              </AuthorAvatarName>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AuthorAvatarName userId={authorId} fallbackName={displayName} name={displayName} color={displayColor} src={displayAvatarUrl} size={42} anonymous={post?.anonymous}>
                    <span className={`font-bold text-sm md:text-[15px] truncate transition ${post?.anonymous || !authorId ? "" : "cursor-pointer hover:opacity-80"}`} style={{ color: T.text }}>
                      {displayName}
                    </span>
                  </AuthorAvatarName>
                  {post?.anonymous ? <Lock size={13} style={{ color: T.textSubtle }} /> : null}
                  <span className="text-xs" style={{ color: T.textSubtle }}>
                    <ClientTimeAgo date={postCreatedAt} />
                  </span>
                  {editedPost ? (
                    <>
                      <span className="text-[10px] leading-none" style={{ color: "rgba(102,112,133,0.45)" }}>•</span>
                      <span className="text-[11px] font-semibold leading-none" style={{ color: "rgba(102,112,133,0.62)" }} title={postUpdatedAt ? `Edited ${new Date(postUpdatedAt).toLocaleString()}` : "Edited"}>
                        edited
                      </span>
                    </>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: T.border, color: T.textMuted }}>
                    {category?.label || post?.category || "General"}
                  </span>
                  {isReported ? (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: T.goldBg, borderColor: "#F3D08A", color: T.gold }}>
                      Post under review
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((value) => !value);
                  setCommentMenuOpenId(null);
                }}
                className="h-9 w-9 rounded-full flex items-center justify-center transition hover:bg-black/[0.04]"
                style={{ color: T.textMuted }}
                aria-label="Post options"
              >
                <MoreHorizontal size={19} />
              </button>

              {menuOpen ? (
                <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: T.card, borderColor: T.border }}>
                  {ownsPost ? (
                    <>
                      <MenuButton icon={Edit3} onClick={handleEditClick}>Edit post</MenuButton>
                      <MenuButton icon={Trash2} danger onClick={handleDeleteClick}>Delete post</MenuButton>
                    </>
                  ) : (
                    <>
                      {isAdmin ? <MenuButton icon={Trash2} danger onClick={handleDeleteClick}>Delete post</MenuButton> : null}
                      <MenuButton icon={Flag} danger={userReported} onClick={handleReport}>{userReported ? "Reported" : "Report post"}</MenuButton>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {bodyText ? (
            <div className="mt-4 text-[16px] md:text-[17px] leading-8" style={{ color: T.text }}>
              <ExpandableText text={bodyText} />
            </div>
          ) : null}

          {postImage ? (
            <PostImagePreview image={postImage} onOpen={setActiveImage} alt={imageAlt} />
          ) : null}
        </div>

        <div className="mx-4 md:mx-5 border-t flex items-center justify-between gap-1 py-1.5" style={{ borderColor: T.borderSoft || T.border }}>
          <ActionButton icon={ArrowBigUp} label="Upvote" count={upvoteCount} active={userUpvoted} fillWhenActive onClick={handleUpvote} disabled={upvoteSubmitting} />
          <ActionButton icon={MessageCircle} label="Replies" count={commentCount} active={showComments} fillWhenActive onClick={handleToggleComments} />
          <ActionButton icon={Share2} label="Share" onClick={handleShare} />
        </div>

        {showComments ? (
          <div className="px-4 md:px-5 pb-4">
            <div className="space-y-3 pt-2">
              {commentsLoading ? (
                <div className="py-3 text-center text-sm font-medium" style={{ color: T.textSubtle }}>
                  Loading replies…
                </div>
              ) : null}
              {!commentsLoading && comments.length === 0 ? (
                <div className="py-2 text-sm" style={{ color: T.textSubtle }}>
                  No replies yet. Be the first to help.
                </div>
              ) : null}
              {comments.map((item) => {
                const itemCommentId = getCommentId(item);

                return (
                  <CommentRow
                    key={itemCommentId || `${postId}-${item.created_at}-${item.body}`}
                    comment={item}
                    post={safePost}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    menuOpen={commentMenuOpenId === itemCommentId}
                    onToggleMenu={(id) => {
                      setMenuOpen(false);
                      setCommentMenuOpenId((value) => (value === id ? null : id));
                    }}
                    onDeleteRequest={(selectedComment) => {
                      setCommentMenuOpenId(null);
                      setCommentToDelete(selectedComment);
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-3 flex items-start gap-2.5">
              <AuthorAvatarName userId={shouldMaskViewerReply ? null : currentUser?.id} fallbackName={replyName} name={replyName} color={replyColor} src={replyAvatarUrl} size={32} anonymous={shouldMaskViewerReply}>
                <Avatar name={replyName} color={replyColor} src={replyAvatarUrl} size={32} />
              </AuthorAvatarName>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: T.border, backgroundColor: "rgba(244,248,253,0.72)" }}>
                  <input
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                      setCommentError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submitComment();
                      }
                    }}
                    placeholder={commentSubmitting ? "Posting reply…" : "Write a reply..."}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9AA4B2] disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ color: T.text }}
                    disabled={commentSubmitting}
                  />
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={commentSubmitting || !comment.trim()}
                    className="h-8 w-8 rounded-full flex items-center justify-center disabled:opacity-45 disabled:pointer-events-none"
                    style={{ backgroundColor: T.navy, color: "white" }}
                    aria-label="Send reply"
                  >
                    <Send size={15} />
                  </button>
                </div>
                {commentError ? (
                  <div className="mt-2 text-xs font-medium" style={{ color: T.red }}>
                    {commentError}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </article>

      {activeImage ? (
        <PostImageLightbox image={activeImage} onClose={() => setActiveImage(null)} alt={imageAlt} />
      ) : null}

      {editingOpen ? <EditPostModal post={safePost} onClose={() => setEditingOpen(false)} onSave={handleEditSave} /> : null}

      <ConfirmDialog
        open={deletingOpen}
        title="Delete this post?"
        body={adminModeratingOtherPost ? "This will permanently delete another user's post and its comments from SoldierHub. This cannot be undone." : "This will remove this post from SoldierHub."}
        confirmText={deleting ? "Deleting…" : "Delete post"}
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setDeletingOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(commentToDelete)}
        title="Delete this comment?"
        body="This will remove this comment from the post."
        confirmText={deletingComment ? "Deleting…" : "Delete comment"}
        danger
        onConfirm={handleDeleteCommentConfirm}
        onCancel={() => {
          if (!deletingComment) setCommentToDelete(null);
        }}
      />
    </>
  );
}
