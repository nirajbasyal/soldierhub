"use client";
import { useState } from "react";
import { ArrowUp, Edit3, MessageCircle, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import { useApp } from "@/store/AppContext";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditPostModal from "./EditPostModal";

export default function UserPostList() {
  const { myPosts: userPosts, editMyPost, deleteMyPost } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const stats = [
    { label: "Posts", value: userPosts.length },
    { label: "Upvotes received", value: userPosts.reduce((s, p) => s + (p.upvote_count || 0), 0) },
    { label: "Replies", value: userPosts.reduce((s, p) => s + (p.comment_count || 0), 0) },
  ];

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t" style={{ borderColor: T.borderSoft }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-2xl tabular-nums font-serif" style={{ color: T.navy }}>{s.value}</div>
            <div className="text-xs uppercase tracking-wider mt-0.5" style={{ color: T.textSubtle }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl mt-8 mb-3 font-serif" style={{ color: T.navy }}>Your posts</h2>

      <div className="flex flex-col gap-3">
        {userPosts.length === 0 && (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{ backgroundColor: T.card, borderColor: T.border }}
          >
            <div className="text-sm" style={{ color: T.textMuted }}>
              You haven&apos;t posted anything yet.
            </div>
          </div>
        )}
        {userPosts.map((p) => {
          const cat = CATEGORIES.find((c) => c.key === p.category);
          return (
            <div
              key={p.id}
              className="rounded-2xl border p-5"
              style={{ backgroundColor: T.card, borderColor: T.border }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <Badge tone={cat?.tone}>{p.category}</Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="iconSm" icon={Edit3}
                          onClick={() => setEditingId(p.id)} />
                  <Button variant="ghost" size="iconSm" icon={Trash2}
                          onClick={() => setDeletingId(p.id)} />
                </div>
              </div>
              <h3 className="text-lg font-semibold leading-snug" style={{ color: T.text }}>{p.title}</h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: T.textMuted }}>{p.body}</p>
              <div className="flex items-center gap-3 text-xs mt-3" style={{ color: T.textSubtle }}>
                <span className="flex items-center gap-1"><ArrowUp size={12} />{p.upvote_count || 0}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} />{p.comment_count || 0}</span>
                <span>{timeAgo(p.created_at)}</span>
                {p.edited && <span>· edited</span>}
              </div>
            </div>
          );
        })}
      </div>

      {editingId && (
        <EditPostModal
          post={userPosts.find((p) => p.id === editingId)}
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
        onConfirm={() => { deleteMyPost(deletingId); setDeletingId(null); }}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}
