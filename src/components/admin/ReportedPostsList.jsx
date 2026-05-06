"use client";
import { useState } from "react";
import { ArrowLeft, Flag, ShieldCheck, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T } from "@/lib/theme";
import { timeAgo } from "@/lib/helpers";
import { useApp } from "@/store/AppContext";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ExpandableText from "@/components/ui/ExpandableText";

const REPORTED_POST_PREVIEW_LENGTH = 260;

export default function ReportedPostsList() {
  const { posts, restoreReportedPost, adminDeletePost } = useApp();
  const reported = posts.filter((p) => p.status === "reported");
  const [confirm, setConfirm] = useState(null);

  if (reported.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No reports" body="No posts are currently flagged." />;
  }

  return (
    <div className="grid gap-3">
      {reported.map((p) => {
        const cat = CATEGORIES.find((c) => c.key === p.category);

        return (
          <article
            key={p.id}
            className="rounded-3xl border p-4 md:p-5 relative overflow-hidden"
            style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 10px 26px rgba(7,27,51,0.05)" }}
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />

            <div className="pl-2">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Badge tone={cat?.tone}>{p.category}</Badge>
                  <Badge tone="red" icon={Flag}>{p.report_count} {p.report_count === 1 ? "report" : "reports"}</Badge>
                  <span className="text-xs font-medium" style={{ color: T.textSubtle }}>
                    by {p.author_name} · {timeAgo(p.created_at)}
                  </span>
                </div>
              </div>

              <h3 className="text-[18px] md:text-[20px] font-extrabold leading-snug tracking-[-0.01em]" style={{ color: T.navy }}>
                {p.title}
              </h3>

              <div className="mt-2">
                <ExpandableText
                  text={p.body || ""}
                  previewLength={REPORTED_POST_PREVIEW_LENGTH}
                  className="text-[14px] md:text-[15px] leading-7 whitespace-pre-wrap"
                  style={{ color: T.text }}
                  buttonSize="xs"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button variant="softSuccess" size="sm" icon={ArrowLeft} onClick={() => restoreReportedPost(p.id)}>
                  Send back to feed
                </Button>
                <Button variant="softDanger" size="sm" icon={Trash2} onClick={() => setConfirm({ id: p.id })}>
                  Permanent delete
                </Button>
              </div>
            </div>
          </article>
        );
      })}

      <ConfirmDialog
        open={!!confirm}
        title="Permanently delete this post?"
        body="The post and all its comments will be removed permanently. This cannot be undone."
        confirmText="Delete permanently"
        danger
        onConfirm={() => { adminDeletePost(confirm.id); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
