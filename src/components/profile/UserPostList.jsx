"use client";

import { useMemo } from "react";
import { FileText, PenLine } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import PostCard from "@/components/feed/PostCard";

function getPostId(post) {
  return post?.id || post?.postId || post?.post?.id || post?.post_id || null;
}

function normalizeProfilePost(post, currentUser) {
  const id = getPostId(post);

  const commentCount =
    post?.comment_count ?? post?.comments_count ?? post?.reply_count ?? 0;
  const upvoteCount = post?.upvote_count ?? post?.upvotes_count ?? post?.upvotes ?? 0;

  return {
    ...post,
    id,
    post_id: id,
    author_id:
      post?.author_id ||
      post?.user_id ||
      post?.profile_id ||
      post?.created_by ||
      post?.author_user_id ||
      currentUser?.id ||
      null,
    author_name:
      post?.author_name ||
      post?.author_name_cached ||
      post?.full_name ||
      post?.profile_full_name ||
      currentUser?.full_name ||
      "Member",
    author_color:
      post?.author_color ||
      post?.author_color_cached ||
      post?.avatar_color ||
      post?.profile_avatar_color ||
      currentUser?.avatar_color ||
      "#314A66",
    upvote_count: upvoteCount,
    comment_count: commentCount,
    reply_count: commentCount,
    viewer_is_author: true,
  };
}

function isNewerPost(candidate, current) {
  const candidateUpdated = new Date(
    candidate?.updated_at || candidate?.created_at || 0
  ).getTime();
  const currentUpdated = new Date(
    current?.updated_at || current?.created_at || 0
  ).getTime();

  if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated;

  const candidateTotal = (candidate?.upvote_count || 0) + (candidate?.comment_count || 0);
  const currentTotal = (current?.upvote_count || 0) + (current?.comment_count || 0);

  return candidateTotal >= currentTotal;
}

function dedupePosts(posts, currentUser) {
  const byId = new Map();

  (posts || []).forEach((rawPost) => {
    const post = normalizeProfilePost(rawPost, currentUser);
    if (!post.id) return;

    const existing = byId.get(post.id);
    if (!existing || isNewerPost(post, existing)) {
      byId.set(post.id, post);
    }
  });

  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

function postBelongsToCurrentUser(post, currentUser) {
  if (!post || !currentUser?.id) return false;

  return (
    post.viewer_is_author === true ||
    post.author_id === currentUser.id ||
    post.user_id === currentUser.id ||
    post.profile_id === currentUser.id ||
    post.created_by === currentUser.id ||
    post.author_user_id === currentUser.id
  );
}

export default function UserPostList() {
  const { currentUser, posts = [], myPosts: userPosts = [] } = useApp();

  const visiblePosts = useMemo(() => {
    if (!currentUser?.id) return [];

    // Put home feed posts last so their live upvote/reply counts can win
    // over an older myPosts copy when both contain the same post id.
    const combined = [
      ...(Array.isArray(userPosts) ? userPosts : []),
      ...(Array.isArray(posts)
        ? posts.filter((post) => postBelongsToCurrentUser(post, currentUser))
        : []),
    ];

    return dedupePosts(combined, currentUser);
  }, [currentUser, posts, userPosts]);

  return (
    <section className="mt-6">
      <div
        className="rounded-3xl border p-4 md:p-5 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: T.softBlue || "#EAF2FC" }}
          >
            <FileText size={20} style={{ color: T.blue }} />
          </div>
          <div>
            <h2
              className="text-xl md:text-2xl font-extrabold tracking-[-0.02em]"
              style={{ color: T.navy }}
            >
              Your posts
            </h2>
            <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
              Posts you have shared with the Fort Bliss community.
            </p>
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ backgroundColor: T.bgSoft || "#F4F8FD", color: T.textSubtle }}
        >
          {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"}
        </div>
      </div>

      <div className="-mx-4 md:mx-0 flex flex-col gap-2.5 sh-feed-post-list">
        {visiblePosts.length === 0 && (
          <div
            className="mx-4 md:mx-0 rounded-3xl border p-8 md:p-10 text-center"
            style={{ backgroundColor: T.card, borderColor: T.border }}
          >
            <div
              className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: T.softBlue || "#EAF2FC" }}
            >
              <PenLine size={24} style={{ color: T.blue }} />
            </div>
            <h3 className="mt-4 text-xl font-bold" style={{ color: T.navy }}>
              No posts yet
            </h3>
            <p className="mt-2 text-sm leading-7 max-w-md mx-auto" style={{ color: T.textMuted }}>
              Your posts will appear here after you share something with the Fort Bliss community.
            </p>
          </div>
        )}

        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
