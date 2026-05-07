"use client";

import { FileText, PenLine } from "lucide-react";
import { T } from "@/lib/theme";
import PostCard from "@/components/feed/PostCard";

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
            <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em]" style={{ color: T.navy }}>
              Public posts
            </h2>
            <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
              Posts shared publicly by {profileName}.
            </p>
          </div>
        </div>
        <div className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "rgba(244,248,253,0.95)", color: T.textSubtle }}>
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </div>
      </div>

      <div className="-mx-4 md:mx-0 flex flex-col gap-2.5 sh-feed-post-list">
        {posts.length === 0 && (
          <div className="mx-4 md:mx-0 rounded-3xl border p-8 md:p-10 text-center" style={{ backgroundColor: T.card, borderColor: T.border, boxShadow: "0 12px 30px rgba(7,27,51,0.05)" }}>
            <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(220,232,247,0.95)" }}>
              <PenLine size={24} style={{ color: T.blue }} />
            </div>
            <h3 className="mt-4 text-xl font-bold" style={{ color: T.navy }}>
              No public posts yet
            </h3>
            <p className="mt-2 text-sm leading-7 max-w-md mx-auto" style={{ color: T.textMuted }}>
              Anonymous posts are not shown on visitor profiles.
            </p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
