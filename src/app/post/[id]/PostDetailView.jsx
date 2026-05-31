"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import EmptyState from "@/components/ui/EmptyState";

function getPostId(post) {
  return post?.id || post?.post_id || post?.postId || post?.post?.id || null;
}

function normalizePostRow(row = {}) {
  const profile = row.profile || row.profiles || row.author || null;
  const postId = getPostId(row);

  return {
    ...row,
    id: postId,
    post_id: postId,
    author_id:
      row.author_id ||
      row.user_id ||
      row.profile_id ||
      row.created_by ||
      row.author_user_id ||
      profile?.id ||
      null,
    author_name:
      row.author_name ||
      row.author_name_cached ||
      row.full_name ||
      row.profile_full_name ||
      profile?.full_name ||
      "Member",
    author_color:
      row.author_color ||
      row.author_color_cached ||
      row.avatar_color ||
      row.profile_avatar_color ||
      profile?.avatar_color ||
      "#314A66",
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: row.comment_count ?? row.comments_count ?? row.reply_count ?? 0,
  };
}

export default function PostDetailView() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { posts = [], isLiveMode } = useApp();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const openRepliesDefault = searchParams?.get("replies") === "1";
  const openedFromNotification =
    openRepliesDefault || searchParams?.get("from") === "notifications";

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    let cancelled = false;
    setLoading(true);

    const found = posts.find((p) => getPostId(p) === id);
    if (found) {
      setPost(normalizePostRow(found));
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (isLiveMode) {
      (async () => {
        const supabase = createClient();
        if (!supabase) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("posts_with_meta")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (cancelled) return;
        setPost(data ? normalizePostRow(data) : null);
        setLoading(false);
      })();
    } else {
      setPost(null);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [params?.id, posts, isLiveMode]);

  const handleBack = () => {
    router.push(openedFromNotification ? "/notifications" : "/");
  };

  return (
    <AppShell>
      <main className="min-h-screen bg-[#F3F6FA] pb-24 md:pb-12">
        <div className="mx-auto w-full max-w-2xl px-0 py-0 md:px-6 md:py-6">
          <div className="px-4 pt-4 md:px-0 md:pt-0">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4E8C]/35"
              aria-label={openedFromNotification ? "Back to notifications" : "Back to feed"}
              title={openedFromNotification ? "Back to notifications" : "Back to feed"}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex w-full flex-col gap-[3px] sh-feed-post-list scroll-mt-24">
            {loading ? (
              <PostSkeleton />
            ) : post ? (
              <PostCard post={post} openRepliesDefault={openRepliesDefault} />
            ) : (
              <div
                className="mx-4 rounded-[24px] border p-6 md:mx-0 sh-card-premium"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                <EmptyState
                  icon={Inbox}
                  title="Post not found"
                  body="This post may have been removed or the link is not valid."
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
