"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import MobileWeatherStrip from "@/components/tools/MobileWeatherStrip";
import BAHCard from "@/components/tools/BAHCard";
import GateHoursCard from "@/components/tools/GateHoursCard";
import SiteInfoCard from "@/components/tools/SiteInfoCard";

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

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { posts, isLiveMode } = useApp();
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
      <main className="max-w-6xl mx-auto px-0 md:px-5 pt-0 md:pt-6 pb-24 md:pb-10 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-2 lg:gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="block lg:hidden pt-1 px-2">
              <MobileWeatherStrip />
            </div>

            <div className="px-2 md:px-0 pt-2 md:pt-0">
              <Button variant="secondary" icon={ArrowLeft} onClick={handleBack}>
                {openedFromNotification ? "Back to notifications" : "Back to feed"}
              </Button>
            </div>

            {loading ? (
              <div className="mx-0 flex w-full flex-col gap-[3px] sh-feed-post-list scroll-mt-24">
                <PostSkeleton />
              </div>
            ) : post ? (
              <div className="mx-0 flex w-full flex-col gap-[3px] sh-feed-post-list scroll-mt-24">
                <PostCard post={post} openRepliesDefault={openRepliesDefault} />
              </div>
            ) : (
              <div
                className="mx-2 md:mx-0 rounded-[24px] border p-6 sh-card-premium"
                style={{ backgroundColor: T.card, borderColor: T.border }}
              >
                <EmptyState
                  icon={Inbox}
                  title="Post not found"
                  body="This post may have been removed or the link is incorrect."
                />
              </div>
            )}
          </div>

          <aside className="hidden lg:flex flex-col gap-3 sticky top-24 self-start">
            <MobileWeatherStrip />
            <BAHCard />
            <GateHoursCard />
            <SiteInfoCard />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
