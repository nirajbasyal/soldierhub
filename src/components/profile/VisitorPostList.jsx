"use client";

import { ArrowUp, FileText, MessageCircle, PenLine } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import Badge from "@/components/ui/Badge";
import ExpandableText from "@/components/ui/ExpandableText";
import ClientTimeAgo from "@/components/ui/ClientTimeAgo";

const PREVIEW_LENGTH = 320;

function StatMini({ icon: Icon, value, label }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.textMuted }}
    >
      <Icon size={13} style={{ color: T.blue }} />
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

export default function VisitorPostList({ posts = [], profileName = "This member" }) {
  return (
    <section className="mt-6">
      <div
        className="rounded-3xl border p-4 md:p-5 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ backgroundColor: "rgba(255,255,255,0.86)", borderColor: T.border }}
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
            <FileText size={20} style={{ color: T.blue }} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>Public posts</h2>
            <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>Posts shared publicly by {profileName}.</p>
          </div>
        </div>
        <div className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.textSubtle }}>
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {posts.length === 0 && (
          <div className="rounded-3xl border p-8 md:p-10 text-center" style={{ backgroundColor: T.card, borderColor: T.border, boxShadow: "0 12px 30px rgba(7,27,51,0.05)" }}>
            <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
              <PenLine size={24} style={{ color: T.blue }} />
            </div>
            <h3 className="mt-4 text-xl font-bold" style={{ color: T.navy }}>No public posts yet</h3>
            <p className="mt-2 text-sm leading-7 max-w-md mx-auto" style={{ color: T.textMuted }}>Anonymous posts are not shown on visitor profiles.</p>
          </div>
        )}

        {posts.map((post) => {
          const cat = CATEGORIES.find((c) => c.key === post.category);
          const upvotes = post.upvote_count || 0;
          const replies = post.comment_count || 0;
          return (
            <article key={post.id} className="rounded-3xl border p-4 md:p-5 relative overflow-hidden" style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 10px 26px rgba(7,27,51,0.05)" }}>
              <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />
              <div className="pl-2">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge tone={cat?.tone || "blue"}>{cat?.label || post.category}</Badge>
                  <span className="text-xs font-medium" style={{ color: T.textSubtle }}><ClientTimeAgo date={post.created_at} /></span>
                  {post.edited && <span className="text-xs font-medium" style={{ color: T.textSubtle }}>· edited</span>}
                </div>
                <h3 className="text-[18px] md:text-[20px] font-extrabold leading-snug tracking-[-0.01em]" style={{ color: T.navy }}>{post.title}</h3>
                {post.body ? (
                  <div className="mt-2">
                    <ExpandableText text={post.body || ""} previewLength={PREVIEW_LENGTH} className="text-[14px] md:text-[15px] leading-7 whitespace-pre-wrap" style={{ color: T.text }} buttonSize="xs" />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  <StatMini icon={ArrowUp} value={upvotes} label={upvotes === 1 ? "upvote" : "upvotes"} />
                  <StatMini icon={MessageCircle} value={replies} label={replies === 1 ? "reply" : "replies"} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
