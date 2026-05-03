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
import IconButton from "@/components/ui/IconButton";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";

const POST_PREVIEW_LENGTH = 240;
const COMMENT_PREVIEW_LENGTH = 120;

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
    postComments,
    loadCommentsForPost,
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  const cat = CATEGORIES.find((c) => c.key === post.category) || CATEGORIES[0];

  const userUpvoted = currentUser && myUpvotes.has(post.id);
  const userReported = myReports.has(post.id);
  const isReported = post.status === "reported";

  const displayName = post.anonymous ? "Anonymous Soldier" : post.author_name;

  const displayColor = post.anonymous
    ? "#5C6470"
    : post.author_color || colorFromString(post.author_name);

  const comments = postComments[post.id] || [];
  const commentCount = post.comment_count ?? comments.length;

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
    setCommentError("");

    const cleanedComment = comment.trim();

    if (!cleanedComment) return;

    const mod = await moderateAsync(cleanedComment);

    if (!mod.allowed) {
      setCommentError(mod.reason);
      return;
    }

    const result = await commentOnPost(post.id, cleanedComment);

    if (result?.ok === false) {
      setCommentError(result.error || "Could not post comment.");
      return;
    }

    setComment("");
  };

  return (
    <article
      className="rounded-2xl border transition-shadow hover:shadow-sm"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar name={displayName} color={displayColor} size={36} />

            <div className="text-left min-w-0 flex-1">
              <div
                className="text-sm font-semibold truncate"
                style={{ color: T.text }}
              >
                {displayName}
              </div>

              <div
                className="text-xs flex items-center gap-1.5 flex-wrap"
                style={{ color: T.textSubtle }}
              >
                {post.anonymous && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Lock size={10} strokeWidth={2.5} /> anonymous
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

          <div className="flex items-center gap-1.5 flex-wrap shrink-0 justify-end">
            <Badge tone={cat.tone}>{cat.label}</Badge>

            {isReported && (
              <Badge tone="red" icon={ShieldAlert}>
                Under review
              </Badge>
            )}
          </div>
        </div>

        {/* Body */}
        <h3
          className="text-lg md:text-xl mb-2 leading-snug font-semibold tracking-tight"
          style={{ color: T.text }}
        >
          {post.title}
        </h3>

        <ExpandableText
          text={post.body || ""}
          previewLength={POST_PREVIEW_LENGTH}
          className="text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{ color: T.textMuted }}
          buttonSize="sm"
        />

        {/* Actions */}
        <div className="flex items-center gap-1 mt-4 -mx-1.5">
          <IconButton
            icon={ArrowUp}
            label="Upvote"
            count={post.upvote_count}
            active={userUpvoted}
            onClick={() => guard(() => upvotePost(post.id))}
          />

          <IconButton
            icon={MessageCircle}
            label="Comments"
            count={commentCount}
            active={showComments}
            onClick={toggleComments}
          />

          <IconButton
            icon={Share2}
            label="Share"
            onClick={() => shareOrCopy(post, pushToast)}
          />

          <div className="ml-auto">
            <IconButton
              icon={Flag}
              label={userReported ? "Reported" : "Report"}
              active={userReported}
              onClick={() => reportPost(post.id)}
            />
          </div>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div
          className="border-t"
          style={{ borderColor: T.borderSoft, backgroundColor: T.surface }}
        >
          <div className="p-5 md:p-6 flex flex-col gap-3">
            {comments.length === 0 && (
              <div
                className="text-sm text-center py-3"
                style={{ color: T.textSubtle }}
              >
                No comments yet. Be the first to share your thoughts.
              </div>
            )}

            {comments.map((c) => {
              const authorName =
                c.author_name_cached || c.author?.full_name || c.author_name;

              const authorColor =
                c.author_color_cached ||
                c.author?.avatar_color ||
                c.author_color;

              const text = c.body ?? c.text ?? "";

              return (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={authorName} color={authorColor} size={30} />

                  <div
                    className="flex-1 rounded-xl px-3.5 py-2.5 border min-w-0"
                    style={{
                      backgroundColor: T.card,
                      borderColor: T.borderSoft,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: T.text }}
                      >
                        {authorName || "Member"}
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
              <div className="flex gap-2 items-end mt-1">
                <Avatar
                  name={currentUser.full_name}
                  color={currentUser.avatar_color}
                  size={30}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 min-w-0">
                    <input
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        setCommentError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && comment.trim()) {
                          submitComment();
                        }
                      }}
                      placeholder="Write a thoughtful reply…"
                      className="flex-1 min-w-0 h-10 px-3.5 rounded-xl border text-sm outline-none"
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
                      disabled={!comment.trim()}
                    >
                      Reply
                    </Button>
                  </div>

                  {commentError && (
                    <div
                      className="text-xs mt-1.5"
                      style={{ color: T.danger || T.red || "#B42318" }}
                    >
                      {commentError}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => guard(() => {})}
                className="text-xs text-center w-full py-2 rounded-lg border"
                style={{
                  borderColor: T.borderSoft,
                  color: T.textMuted,
                  backgroundColor: T.card,
                }}
              >
                Sign in as a verified member to reply.
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}