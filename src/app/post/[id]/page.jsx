"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import { normalizePostRow } from "@/lib/db/posts";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import PostCard from "@/components/feed/PostCard";
import PostSkeleton from "@/components/ui/PostSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Inbox } from "lucide-react";

/**
 * Single post page — used for share links (/post/<id>).
 * In demo mode reads from in-memory posts. In live mode fetches from Supabase
 * if the post isn't already cached.
 */
export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { posts, isLiveMode } = useApp();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    // Check in-memory first
    const found = posts.find((p) => p.id === id);
    if (found) {
      setPost(found);
      setLoading(false);
      return;
    }

    // Fall back to direct fetch in live mode
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
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => router.push("/")}
          >
            Back to feed
          </Button>

          <div className="mt-6">
            {loading ? (
              <PostSkeleton />
            ) : post ? (
              <PostCard post={post} />
            ) : (
              <div
                className="rounded-2xl border p-8"
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

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
