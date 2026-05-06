"use client";

import { useState } from "react";
import {
  ArrowUp,
  Flag,
  Lock,
  MessageCircle,
  Send,
  Share2,
  ShieldAlert,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { colorFromString, shareOrCopy } from "@/lib/helpers";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";

const POST_PREVIEW_LENGTH = 900;
const COMMENT_PREVIEW_LENGTH = 120;

function getAnonymousDisplayName(postId) {
  const source = String(postId || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  const number = String(total % 10000).padStart(4, "0");
  return `Anonymous${number}`;
}

function getSafeCommentAuthor({ comment, post }) {
  const anonymousName = getAnonymousDisplayName(post.id);

  const isAnonymousPostAuthorComment =
    post.anonymous &&
    (comment.is_anonymous_author === true ||
      (comment.author_id &&
        post.author_id &&
        comment.author_id === post.author_id));

  if (isAnonymousPostAuthorComment) {
    return {
      name: anonymousName,
      color: "#5C6470",
      anonymous: true,
    };
  }

  return {
    name:
      comment.author_name_cached ||
      comment.author?.full_name ||
      comment.author_name ||
      "Member",
    color:
      comment.author_color_cached ||
      comment.author?.avatar_color ||
      comment.author_color ||
      "#314A66",
    anonymous: false,
  };
}

function FeedActionButton({ icon: Icon, label, count, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-full text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 px-3 hover:-translate-y-0.5"
      style={{
        color: active ? "#FFFFFF" : T.textMuted,
        background: active
          ? "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)"
          : "rgba(255,255,255,0.76)",
        border: `1px solid ${active ? "rgba(7,27,51,0.18)" : T.borderSoft}`,
        boxShadow: active ? "0 8px 18px rgba(7,27,51,0.14)" : "none",
      }}
    >
      <Icon size={17} strokeWidth={2.25} />
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center"
          style={{
            backgroundColor: active ? "rgba(255,255,255,0.18)" : T.surface,
            color: active ? "#FFFFFF" : T.textSubtle,
          }}
        >
          {count}
        </span>
      ) : null}
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
    myUpvotes,
    myReports,
    myPosts,
    postComments,
    loadCommentsForPost,
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const cat = CATEGORIES.find((c) => c.key === post.category) || CATEGORIES[0];

  const userUpvoted = Boolean(currentUser && myUpvotes.has(post.id));
  const userReported = Boolean(myReports.has(post.id));
  const isReported = post.status === "reported";

  const anonymousDisplayName = getAnonymousDisplayName(post.id);

  const displayName = post.anonymous
    ? anonymousDisplayName
    : post.author_name || "Member";

  const displayColor = post.anonymous
    ? "#5C6470"
    : post.author_color || colorFromString(post.author_name || "Member");

  const comments = postComments[post.id] || [];
  const commentCount = post.comment_count ?? comments.length;
  const upvoteCount = post.upvote_count ?? 0;

  const ownsPostBySafeViewerFlag = post.viewer_is_author === true;

  const ownsPostByVisibleAuthorId =
    currentUser?.id && post.author_id && post.author_id === currentUser.id;

  const ownsPostByMyPosts =
    currentUser?.id &&
    Array.isArray(myPosts) &&
    myPosts.some((myPost) => myPost.id === post.id);

  const currentUserIsAnonymousPostAuthor =
    Boolean(post.anonymous) &&
    Boolean(
      ownsPostBySafeViewerFlag || ownsPostByVisibleAuthorId || ownsPostByMyPosts
    );

  const replyAvatarName = currentUserIsAnonymousPostAuthor
    ? anonymousDisplayName
    : currentUser?.full_name || "Member";

  const replyAvatarColor = currentUserIsAnonymousPostAuthor
    ? "#5C6470"
    : currentUser?.avatar_color ||
      colorFromString(currentUser?.full_name || "Member");

  const replyPlaceholder = currentUserIsAnonymousPostAuthor
    ? `Reply as ${anonymousDisplayName}…`
    : "Write a reply...";

  const guard = (fn) => {
    if (requireAuth()) fn();
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);

    if (next) {
      loadCommentsForPost(post.id);
    }
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
    <article
      className="group overflow-hidden rounded-[18px] border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
      }}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-[#B31942] via-[#FDFEFF] to-[#1E4E8C]" />

      <div className="px-4 md:px-6 pt-4 pb-3">
        {/* Author row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              <Avatar name={displayName} color={displayColor} size={42} />
              <div
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2"
                style={{ backgroundColor: T.green, borderColor: T.card }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="text-[15px] font-bold leading-tight truncate"
                style={{ color: T.text }}
              >
                {displayName}
              </div>

              <div
                className="mt-1 text-xs flex items-center gap-1.5 flex-wrap"
                style={{ color: T.textSubtle }}
              >
                {post.anonymous && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Lock size={10} strokeWidth={2.5} />
                      anonymous
                    </span>
                    <span>·</span>
                  </>
                )}

                <ClientTimeAgo date={post.created_at} />

                {post.edited && (
                  <>
                    <span>·</span>
                    <span>edited</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Badge tone={cat.tone}>{cat.label}</Badge>

            {isReported && (
              <Badge tone="red" icon={ShieldAlert}>
                Under review
              </Badge>
            )}
          </div>
        </div>

        {/* Full-focus text post area: no inner box/container */}
        <div className="mt-5 md:mt-6">
          {post.title ? (
            <h3
              className="text-[25px] md:text-[32px] leading-[1.12] font-extrabold tracking-[-0.025em]"
              style={{ color: T.text }}
            >
              {post.title}
            </h3>
          ) : null}

          {post.body ? (
            <div className={post.title ? "mt-4" : ""}>
              <ExpandableText
                text={post.body || ""}
                previewLength={POST_PREVIEW_LENGTH}
                className="text-[16px] md:text-[17px] leading-8 whitespace-pre-wrap max-w-none"
                style={{ color: T.text }}
                buttonSize="sm"
              />
            </div>
          ) : null}
        </div>

        {/* Action row only. Counts live inside buttons. */}
        <div
          className="mt-5 rounded-[18px] border p-1.5 flex items-center gap-1.5"
          style={{
            backgroundColor: T.surface,
            borderColor: T.borderSoft,
          }}
        >
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            <FeedActionButton
              icon={ArrowUp}
              label="Upvote"
              count={upvoteCount}
              active={userUpvoted}
              onClick={() => guard(() => upvotePost(post.id))}
            />

            <FeedActionButton
              icon={MessageCircle}
              label="Reply"
              count={commentCount}
              active={showComments}
              onClick={toggleComments}
            />

            <FeedActionButton
              icon={Share2}
              label="Share"
              onClick={() => shareOrCopy(post, pushToast)}
            />
          </div>

          <button
            type="button"
            onClick={() => guard(() => reportPost(post.id))}
            className="w-10 h-10 rounded-full inline-flex items-center justify-center transition-all shrink-0 hover:-translate-y-0.5"
            style={{
              color: userReported ? T.red : T.textMuted,
              backgroundColor: userReported ? T.redBg : "rgba(255,255,255,0.76)",
              border: `1px solid ${userReported ? T.redBg : T.borderSoft}`,
            }}
            aria-label={userReported ? "Reported" : "Report"}
          >
            <Flag size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {showComments && (
        <div
          className="px-4 md:px-5 py-4"
          style={{
            backgroundColor: T.surface,
            borderTop: `1px solid ${T.borderSoft}`,
          }}
        >
          <div className="flex flex-col gap-3">
            {comments.length === 0 && (
              <div
                className="text-sm text-center py-2"
                style={{ color: T.textSubtle }}
              >
                No comments yet. Start the conversation.
              </div>
            )}

            {comments.map((c) => {
              const safeAuthor = getSafeCommentAuthor({
                comment: c,
                post,
              });

              const text = c.body ?? c.text ?? "";

              return (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar
                    name={safeAuthor.name}
                    color={safeAuthor.color}
                    size={32}
                  />

                  <div
                    className="flex-1 rounded-2xl px-3.5 py-3 border min-w-0"
                    style={{
                      backgroundColor: T.card,
                      borderColor: T.borderSoft,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="text-xs font-semibold truncate inline-flex items-center gap-1"
                        style={{ color: T.text }}
                      >
                        {safeAuthor.name}

                        {safeAuthor.anonymous && (
                          <Lock
                            size={10}
                            strokeWidth={2.5}
                            style={{ color: T.textSubtle }}
                          />
                        )}
                      </span>

                      <span
                        className="text-[11px] shrink-0"
                        style={{ color: T.textSubtle }}
                      >
                        <ClientTimeAgo date={c.created_at} />
                      </span>
                    </div>

                    <ExpandableText
                      text={text}
                      previewLength={COMMENT_PREVIEW_LENGTH}
                      className="text-sm break-words whitespace-pre-wrap"
                      style={{ color: T.text }}
                      buttonSize="xs"
                    />
                  </div>
                </div>
              );
            })}

            {currentUser?.status === "verified" ? (
              <div className="flex gap-2.5 pt-1">
                <Avatar
                  name={replyAvatarName}
                  color={replyAvatarColor}
                  size={32}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        setCommentError("");
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          comment.trim() &&
                          !commentSubmitting
                        ) {
                          e.preventDefault();
                          submitComment();
                        }
                      }}
                      placeholder={replyPlaceholder}
                      className="flex-1 min-w-0 h-11 px-4 rounded-full border text-sm outline-none"
                      style={{
                        borderColor: T.border,
                        backgroundColor: T.card,
                        color: T.text,
                      }}
                    />

                    <Button
                      variant="primary"
                      size="md"
                      icon={Send}
                      className="shrink-0"
                      onClick={submitComment}
                      disabled={!comment.trim() || commentSubmitting}
                    >
                      {commentSubmitting ? "Posting..." : "Reply"}
                    </Button>
                  </div>

                  {currentUserIsAnonymousPostAuthor && (
                    <div
                      className="mt-2 text-xs"
                      style={{ color: T.textSubtle }}
                    >
                      You are replying as <strong>{anonymousDisplayName}</strong>.
                    </div>
                  )}

                  {commentError && (
                    <div className="mt-2 text-xs" style={{ color: T.red }}>
                      {commentError}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl border px-4 py-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: T.card,
                  borderColor: T.borderSoft,
                }}
              >
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: T.text }}
                  >
                    Join the conversation
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: T.textSubtle }}
                  >
                    Sign in as a verified member to comment.
                  </div>
                </div>

                <Button variant="secondary" onClick={requireAuth}>
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
