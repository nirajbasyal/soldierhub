"use client";

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
import { colorFromString } from "@/lib/helpers";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditPostModal from "@/components/profile/EditPostModal";
import ProfileIdentityLink from "@/components/ui/ProfileIdentityLink";

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

function getPostCreatedAt(post) {
  return (
    post?.created_at ||
    post?.createdAt ||
    post?.inserted_at ||
    post?.timestamp ||
    post?.date ||
    null
  );
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

function ActionButton({ icon: Icon, label, count, active = false, onClick, fillWhenActive = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 min-w-0 rounded-full px-3 text-xs md:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] hover:bg-black/[0.04]"
      style={{
        color: active ? T.navy : T.textMuted,
        backgroundColor: active ? "rgba(11,28,44,0.07)" : "transparent",
      }}
    >
      <Icon
        size={18}
        className="shrink-0"
        strokeWidth={active ? 2.8 : 2.25}
        fill={active && fillWhenActive ? "currentColor" : "none"}
      />
      <span className="truncate">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[11px] font-extrabold leading-none">
          {count > 99 ? "99+" : count}
        </span>
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

function AuthorAvatarName({ userId, fallbackName = "", name, color, size, anonymous = false, children }) {
  if (anonymous || !userId) {
    return children || <Avatar name={name} color={color} size={size} />;
  }

  return (
    <ProfileIdentityLink
      userId={userId}
      fallbackName={fallbackName || name}
      className="inline-flex cursor-pointer transition hover:opacity-80 focus:outline-none"
    >
      {children || <Avatar name={name} color={color} size={size} />}
    </ProfileIdentityLink>
  );
}

function CommentRow({
  comment,
  post,
  currentUser,
  isAdmin = false,
  menuOpen = false,
  onToggleMenu,
  onDeleteRequest,
}) {
  const postId = getPostId(post);
  const postAuthorId = getAuthorId(post);
  const commentId = getCommentId(comment);
  const commentAuthorId = getAuthorId(comment);
  const anonymousName = getAnonymousDisplayName(postId);
  const anonymousAuthor = Boolean(
    post?.anonymous && commentAuthorId && postAuthorId && commentAuthorId === postAuthorId
  );
  const name = anonymousAuthor ? anonymousName : getDisplayName(comment, "Member");
  const color = anonymousAuthor ? "#5C6470" : getDisplayColor(comment, name);
  const isMine = viewerOwnsComment(comment, currentUser);
  const isSavingComment = isTemporaryCommentId(commentId);
  const canDeleteComment = Boolean(commentId && !isSavingComment && currentUser?.id && (isAdmin || isMine));

  return (
    <div className="group flex items-start gap-2.5">
      <AuthorAvatarName userId={commentAuthorId} fallbackName={name} name={name} color={color} size={30} anonymous={anonymousAuthor}>
        <Avatar name={name} color={color} size={30} />
      </AuthorAvatarName>
      <div className="min-w-0 flex-1">
        <div
          className="relative min-w-0 rounded-2xl px-3 py-2 pr-10"
          style={{ backgroundColor: "rgba(244,248,253,0.95)" }}
        >
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold" style={{ color: T.text }}>
            {anonymousAuthor ? <Lock size={11} className="shrink-0" /> : null}
            <AuthorAvatarName userId={commentAuthorId} fallbackName={name} name={name} color={color} size={30} anonymous={anonymousAuthor}>
              <span className={anonymousAuthor || !commentAuthorId ? "truncate" : "truncate cursor-pointer transition hover:opacity-80"}>
                {name}
              </span>
            </AuthorAvatarName>
            {isMine ? <span className="shrink-0" style={{ color: T.textSubtle }}>(you)</span> : null}
            {isSavingComment ? <span className="shrink-0" style={{ color: T.textSubtle }}>Saving…</span> : null}
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
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-2xl border shadow-xl"
                  style={{ backgroundColor: T.card, borderColor: T.border }}
                >
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
  const safePost = useMemo(() => ({ ...post, id: postId, post_id: postId }), [post, postId]);
  const [showComments, setShowComments] = useState(Boolean(openRepliesDefault));
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentMenuOpenId, setCommentMenuOpenId] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const category = CATEGORIES.find((c) => c.key === post?.category) || CATEGORIES[0];
  const authorId = getAuthorId(post);
  const anonymousName = getAnonymousDisplayName(postId);
  const displayName = post?.anonymous ? anonymousName : getDisplayName(post, "Member");
  const displayColor = post?.anonymous ? "#5C6470" : getDisplayColor(post, displayName);
  const comments = postId ? postComments?.[postId] || [] : [];
  const commentsLoaded = Boolean(
    postId && Object.prototype.hasOwnProperty.call(postComments || {}, postId)
  );
  const storedCommentCount = post?.comment_count ?? post?.reply_count ?? 0;
  const commentCount = commentsLoaded ? comments.length : storedCommentCount;
  const upvoteCount = post?.upvote_count ?? 0;
  const userUpvoted = Boolean(currentUser && postId && myUpvotes?.has?.(postId));
  const userReported = Boolean(postId && myReports?.has?.(postId));
  const isReported = post?.status === "reported";
  const ownsPost = Boolean(
    (currentUser?.id && authorId && currentUser.id === authorId) ||
      post?.viewer_is_author === true ||
      (currentUser?.id &&
        postId &&
        Array.isArray(myPosts) &&
        myPosts.some((myPost) => getPostId(myPost) === postId))
  );
  const adminModeratingOtherPost = Boolean(isAdmin && !ownsPost);
  const replyName = post?.anonymous && ownsPost ? anonymousName : currentUser?.full_name || "Member";
  const replyColor = post?.anonymous && ownsPost ? "#5C6470" : currentUser?.avatar_color || colorFromString(replyName);
  const bodyText = post?.body || post?.content || post?.text || post?.title || "";

  useEffect(() => {
    setShowComments(Boolean(openRepliesDefault));
    setComment("");
    setCommentError("");
    setCommentsLoading(false);
    setCommentMenuOpenId(null);
    setCommentToDelete(null);
  }, [postId, openRepliesDefault]);

  useEffect(() => {
    if (!openRepliesDefault || !postId || commentsLoaded) return;

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
    if (!requireAuth()) return;
    if (!ensurePostId()) return;
    await upvotePost?.(postId);
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
      const result = adminModeratingOtherPost
        ? await adminDeletePost?.(postId)
        : await deleteMyPost?.(postId);

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
      pushToast?.("Please wait until the comment finishes saving.", "info");
      return;
    }

    setDeletingComment(true);
    try {
      const result = await deleteCommentAction?.({ postId, commentId });

      if (result?.ok === false) {
        return pushToast?.(result?.error || "Could not delete comment.", "error");
      }

      setCommentToDelete(null);
    } finally {
      setDeletingComment(false);
    }
  };

  const submitComment = async () => {
    if (commentSubmitting) return;
    setCommentError("");
    if (!requireAuth()) return;
    if (!postId) return setCommentError("Post was not identified. Please refresh and try again.");
    const cleaned = comment.trim();
    if (!cleaned) return;
    setCommentSubmitting(true);
    try {
      const mod = await moderateAsync(cleaned);
      if (!mod.allowed) return setCommentError(mod.reason || "Comment could not be posted.");
      const result = await commentOnPost?.(postId, cleaned);
      if (result?.ok === false) return setCommentError(result.error || "Could not post comment.");
      setComment("");
      setShowComments(true);
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (!postId) return null;

  return (
    <>
      <article
        className="group overflow-visible rounded-none border-x-0 border-t border-b-0 shadow-none transition-colors duration-200 md:border md:rounded-[24px] md:shadow-sm"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div className="px-4 md:px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <AuthorAvatarName userId={authorId} fallbackName={displayName} name={displayName} color={displayColor} size={42} anonymous={post?.anonymous}>
                <Avatar name={displayName} color={displayColor} size={42} />
              </AuthorAvatarName>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AuthorAvatarName userId={authorId} fallbackName={displayName} name={displayName} color={displayColor} size={42} anonymous={post?.anonymous}>
                    <span
                      className={`font-bold text-sm md:text-[15px] truncate transition ${
                        post?.anonymous || !authorId ? "" : "cursor-pointer hover:opacity-80"
                      }`}
                      style={{ color: T.text }}
                    >
                      {displayName}
                    </span>
                  </AuthorAvatarName>
                  {post?.anonymous ? <Lock size={13} style={{ color: T.textSubtle }} /> : null}
                  <span className="text-xs" style={{ color: T.textSubtle }}>
                    <ClientTimeAgo date={postCreatedAt} />
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: "rgba(244,248,253,0.95)",
                      borderColor: T.border,
                      color: T.textMuted,
                    }}
                  >
                    {category?.label || post?.category || "General"}
                  </span>
                  {isReported ? (
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: T.goldBg, borderColor: "#F3D08A", color: T.gold }}
                    >
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
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-2xl border shadow-xl"
                  style={{ backgroundColor: T.card, borderColor: T.border }}
                >
                  {ownsPost ? (
                    <>
                      <MenuButton icon={Edit3} onClick={handleEditClick}>Edit post</MenuButton>
                      <MenuButton icon={Trash2} danger onClick={handleDeleteClick}>Delete post</MenuButton>
                    </>
                  ) : (
                    <>
                      {isAdmin ? (
                        <MenuButton icon={Trash2} danger onClick={handleDeleteClick}>Delete post</MenuButton>
                      ) : null}
                      <MenuButton icon={Flag} danger={userReported} onClick={handleReport}>
                        {userReported ? "Reported" : "Report post"}
                      </MenuButton>
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
        </div>

        <div
          className="mx-4 md:mx-5 border-t flex items-center justify-between gap-1 py-1.5"
          style={{ borderColor: T.borderSoft || T.border }}
        >
          <ActionButton
            icon={ArrowBigUp}
            label="Upvote"
            count={upvoteCount}
            active={userUpvoted}
            fillWhenActive
            onClick={handleUpvote}
          />
          <ActionButton
            icon={MessageCircle}
            label="Replies"
            count={commentCount}
            active={showComments}
            fillWhenActive
            onClick={handleToggleComments}
          />
          <ActionButton
            icon={Share2}
            label="Share"
            onClick={handleShare}
          />
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
              <AuthorAvatarName userId={currentUser?.id} fallbackName={replyName} name={replyName} color={replyColor} size={32} anonymous={post?.anonymous && ownsPost}>
                <Avatar name={replyName} color={replyColor} size={32} />
              </AuthorAvatarName>
              <div className="min-w-0 flex-1">
                <div
                  className="flex items-center gap-2 rounded-2xl border px-3 py-2"
                  style={{ borderColor: T.border, backgroundColor: "rgba(244,248,253,0.72)" }}
                >
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
                    placeholder="Write a reply..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9AA4B2]"
                    style={{ color: T.text }}
                    disabled={commentSubmitting}
                  />
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={commentSubmitting || !comment.trim()}
                    className="h-8 w-8 rounded-full flex items-center justify-center disabled:opacity-45"
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

      {editingOpen ? (
        <EditPostModal post={safePost} onClose={() => setEditingOpen(false)} onSave={handleEditSave} />
      ) : null}

      <ConfirmDialog
        open={deletingOpen}
        title="Delete this post?"
        body={
          adminModeratingOtherPost
            ? "This will permanently delete another user's post and its comments from SoldierHub. This cannot be undone."
            : "This will remove this post from SoldierHub."
        }
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
