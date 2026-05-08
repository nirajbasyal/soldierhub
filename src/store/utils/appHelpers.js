import { colorFromString } from "@/lib/helpers";

export function getProfileStatus(profile) {
  return profile?.status || profile?.verification_status || "pending";
}

export function normalizeSeedPosts(seedPosts) {
  return seedPosts.map((p) => ({
    ...p,
    author_color: colorFromString(p.author_name),
    upvote_count: p.upvotes || 0,
    comment_count: (p.comments || []).length,
    report_count: p.reportCount || 0,
    created_at:
      typeof p.created_at === "number"
        ? new Date(p.created_at).toISOString()
        : p.created_at,
  }));
}
