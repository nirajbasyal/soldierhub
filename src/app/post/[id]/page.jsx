"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import EmptyState from "@/components/ui/EmptyState";

function normalizePostRow(row = {}) {
  const profile = row.profile || row.profiles || row.author || null;
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;

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

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    const found = posts.find((p) => p.id === id);
    if (found) {
      setPost(found);
      setLoading(false);
      return;
    }

    if (isLiveMode) {
      (async () => {
        const supabase = createClient();
        if (!supabase) {
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("posts_with_meta")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        setPost(data ? normalizePostRow(data) : null);
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  }, [params, posts, isLiveMode]);

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-24 md:pb-12" style={{ backgroundColor: T.bg }}>
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/")}>Back to feed</Button>

          <div className="mt-6">
            {loading ? (
              <PostSkeleton />
            ) : post ? (
              <PostCard post={post} openRepliesDefault={openRepliesDefault} />
            ) : (
              <div className="rounded-2xl border p-8" style={{ backgroundColor: T.card, borderColor: T.border }}>
                <EmptyState icon={Inbox} title="Post not found" body="This post may have been removed or the link is incorrect." />
              </div>
            )}
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
