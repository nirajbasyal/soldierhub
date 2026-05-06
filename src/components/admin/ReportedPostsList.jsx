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

const REPORTED_POST_PREVIEW_LENGTH = 300;

export default function ReportedPostsList() {
  const { posts, restoreReportedPost, adminDeletePost } = useApp();
  const reported = posts.filter((p) => p.status === "reported");
  const [confirm, setConfirm] = useState(null);

  if (reported.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No reports" body="No posts are currently flagged." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {reported.map((p) => {
        const cat = CATEGORIES.find((c) => c.key === p.category);
        return (
          <div
            key={p.id}
            className="rounded-xl border p-4"
            style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge tone={cat?.tone}>{p.category}</Badge>
              <Badge tone="red" icon={Flag}>
                {p.report_count} {p.report_count === 1 ? "report" : "reports"}
              </Badge>
              <span className="text-xs ml-auto" style={{ color: T.textSubtle }}>
                by {p.author_name} · {timeAgo(p.created_at)}
              </span>
            </div>

            <div className="text-[18px] md:text-[20px] font-bold leading-snug" style={{ color: T.text }}>
              {p.title}
            </div>

            <div className="mt-2">
              <ExpandableText
                text={p.body || ""}
                previewLength={REPORTED_POST_PREVIEW_LENGTH}
                className="text-[14px] md:text-[15px] leading-7 whitespace-pre-wrap"
                style={{ color: T.text }}
                buttonSize="xs"
              />
            </div>

            <div className="flex gap-2 mt-3">
              <Button variant="softSuccess" size="sm" icon={ArrowLeft}
                      onClick={() => restoreReportedPost(p.id)}>
                Send back to feed
              </Button>
              <Button variant="softDanger" size="sm" icon={Trash2}
                      onClick={() => setConfirm({ id: p.id })}>
                Permanent delete
              </Button>
            </div>
          </div>
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
