import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import PostDetailView from "./PostDetailView";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max = 160) {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// cache() dedupes the RPC between generateMetadata and the page render, so a
// request fetches the post exactly once.
const fetchPost = cache(async (id) => {
  if (!id) return null;

  try {
    const supabase = await createClient();
    if (!supabase) return null;

    // Logged-out crawlers cannot read public.posts directly (no anon SELECT
    // policy; posts_with_meta runs security_invoker). The security-definer
    // get_public_post RPC is the supported anonymous read path.
    const { data, error } = await supabase.rpc("get_public_post", { p_id: id });
    if (error) return null;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.status !== "active") return null;
    return row;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await fetchPost(id);
  const canonical = `${SITE_URL}/post/${id}`;

  if (!post) {
    return {
      title: "Post",
      description:
        "View a post on SoldierHub, the independent Fort Bliss and El Paso military community platform.",
      alternates: { canonical },
    };
  }

  // Posts are body-only (no title column); derive a title from the body.
  // Fall back to a category-based title when the body is empty or too thin
  // (e.g. emoji-only / a bare link) to make a meaningful title.
  const bodyTitle = truncate(post.body, 70);
  const categoryTitle = `${post.category || "Community"} post on SoldierHub`;
  const rawTitle = bodyTitle.replace(/[^\p{L}\p{N}]/gu, "").length >= 12 ? bodyTitle : categoryTitle;
  const description =
    truncate(post.body, 160) ||
    `A post in the ${post.category || "community"} category on SoldierHub.`;
  const author = !post.anonymous && post.author_name ? post.author_name : "SoldierHub member";

  return {
    title: rawTitle,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: rawTitle,
      description,
      authors: [author],
    },
    twitter: {
      card: "summary_large_image",
      title: rawTitle,
      description,
    },
  };
}

export default async function PostDetailPage({ params }) {
  const { id } = await params;
  const post = await fetchPost(id);
  return <PostDetailView initialPost={post} />;
}
