"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  Edit3,
  FileText,
  MessageCircle,
  PenLine,
  Trash2,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";
import EditPostModal from "./EditPostModal";

const PROFILE_POST_PREVIEW_LENGTH = 260;

function StatMini({ icon: Icon, value, label }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: "rgba(244,248,253,0.95)",
        borderColor: "#D5E2F2",
        color: T.textMuted,
      }}
    >
      <Icon size={13} style={{ color: T.blue }} />
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function postBelongsToCurrentUser(post, currentUser) {
  if (!post || !currentUser?.id) return false;

  return (
    post.author_id === currentUser.id ||
    post.user_id === currentUser.id ||
    post.profile_id === currentUser.id ||
    post.viewer_is_author === true
  );
}

export default function UserPostList() {
  const {
    currentUser,
    posts = [],
    myPosts: userPosts = [],
    editMyPost,
    deleteMyPost,
  } = useApp();

  const visiblePosts = useMemo(() => {
    if (userPosts.length > 0) return userPosts;

    return posts.filter((post) => postBelongsToCurrentUser(post, currentUser));
  }, [currentUser, posts, userPosts]);

  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const editingPost = visiblePosts.find((p) => p.id === editingId);

  return (
    <>
      <section className="mt-6">
        <div
          className="rounded-3xl border p-4 md:p-5 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.86)",
            borderColor: T.border,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
            >
              <FileText size={20} style={{ color: T.blue }} />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>
                Your posts
              </h2>
              <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
                Manage your questions, updates, and community discussions.
              </p>
            </div>
          </div>

          <div
            className="rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.textSubtle }}
          >
            {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {visiblePosts.length === 0 && (
            <div
              className="rounded-3xl border p-8 md:p-10 text-center"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                boxShadow: "0 12px 30px rgba(7,27,51,0.05)",
              }}
            >
              <div
                className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
              >
                <PenLine size={24} style={{ color: T.blue }} />
              </div>

              <h3 className="mt-4 text-xl font-bold" style={{ color: T.navy }}>
                No posts yet
              </h3>

              <p className="mt-2 text-sm leading-7 max-w-md mx-auto" style={{ color: T.textMuted }}>
                Your posts will appear here after you share something with the Fort Bliss community.
              </p>
            </div>
          )}

          {visiblePosts.map((p) => {
            const cat = CATEGORIES.find((c) => c.key === p.category);

            return (
              <article
                key={p.id}
                className="rounded-3xl border p-4 md:p-5 relative overflow-hidden"
                style={{
                  backgroundColor: T.card,
                  borderColor: "#D5E2F2",
                  boxShadow: "0 10px 26px rgba(7,27,51,0.05)",
                }}
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

                <div className="pl-2">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge tone={cat?.tone || "blue"}>{cat?.label || p.category}</Badge>

                      <span className="text-xs font-medium" style={{ color: T.textSubtle }}>
                        <ClientTimeAgo date={p.created_at} />
                      </span>

                      {p.edited && (
                        <span className="text-xs font-medium" style={{ color: T.textSubtle }}>
                          · edited
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(p.id)}
                        className="h-9 w-9 rounded-full border flex items-center justify-center transition hover:-translate-y-0.5"
                        style={{
                          backgroundColor: "rgba(244,248,253,0.95)",
                          borderColor: "#D5E2F2",
                          color: T.navy,
                        }}
                        aria-label="Edit post"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(p.id)}
                        className="h-9 w-9 rounded-full border flex items-center justify-center transition hover:-translate-y-0.5"
                        style={{
                          backgroundColor: "rgba(253,236,240,0.95)",
                          borderColor: "#F3C7D1",
                          color: "#B31942",
                        }}
                        aria-label="Delete post"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-[18px] md:text-[20px] font-extrabold leading-snug tracking-[-0.01em]" style={{ color: T.navy }}>
                    {p.title}
                  </h3>

                  {p.body ? (
                    <div className="mt-2">
                      <ExpandableText
                        text={p.body || ""}
                        previewLength={PROFILE_POST_PREVIEW_LENGTH}
                        className="text-[14px] md:text-[15px] leading-7 whitespace-pre-wrap"
                        style={{ color: T.text }}
                        buttonSize="xs"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 flex-wrap mt-4">
                    <StatMini icon={ArrowUp} value={p.upvote_count || 0} label={(p.upvote_count || 0) === 1 ? "upvote" : "upvotes"} />
                    <StatMini icon={MessageCircle} value={p.comment_count || 0} label={(p.comment_count || 0) === 1 ? "reply" : "replies"} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {editingId && editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingId(null)}
          onSave={async (updates) => {
            const result = await editMyPost(editingId, updates);

            if (result?.ok !== false) {
              setEditingId(null);
            }

            return result;
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Delete this post?"
        body="This permanently removes the post and all its comments. This action cannot be undone."
        confirmText="Delete post"
        danger
        onConfirm={() => {
          deleteMyPost(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}
