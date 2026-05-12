import { colorFromString } from "@/lib/helpers";

export function getProfileStatus(profile) {
  return profile?.status || profile?.verification_status || "pending";
}

export function getPostId(post = {}) {
  return post.id || post.post_id || post.postId || post.post?.id || null;
}

export function getPostAuthorId(post = {}) {
  return (
    post.author_id ||
    post.user_id ||
    post.profile_id ||
    post.created_by ||
    post.author_user_id ||
    post.profile?.id ||
    post.profiles?.id ||
    post.author?.id ||
    null
  );
}

export function isAnonymousPublicPost(post = {}) {
  return Boolean(post.anonymous) && !getPostAuthorId(post);
}

export function isIdentifiedPost(post, expectedAuthorId = null) {
  const postId = getPostId(post);
  const authorId = getPostAuthorId(post);

  if (!postId) return false;

  // Public feed RPC intentionally masks author_id for anonymous posts.
  // Those posts are still valid public feed items, but they must not pass
  // expectedAuthorId checks for owner-only/profile views.
  if (!authorId) {
    return !expectedAuthorId && isAnonymousPublicPost(post);
  }

  if (expectedAuthorId && authorId !== expectedAuthorId) return false;

  return true;
}

export function sanitizePosts(posts = [], expectedAuthorId = null) {
  if (!Array.isArray(posts)) return [];

  return posts.filter((post) => isIdentifiedPost(post, expectedAuthorId));
}

export function normalizeSeedPosts(seedPosts) {
  return sanitizePosts(
    seedPosts.map((p) => ({
      ...p,
      id: getPostId(p),
      post_id: getPostId(p),
      author_id: getPostAuthorId(p),
      author_color: colorFromString(p.author_name),
      upvote_count: p.upvotes || 0,
      comment_count: (p.comments || []).length,
      report_count: p.reportCount || 0,
      created_at:
        typeof p.created_at === "number"
          ? new Date(p.created_at).toISOString()
          : p.created_at,
    }))
  );
}
