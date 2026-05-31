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

async function fetchPost(id) {
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
}

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
  const rawTitle = truncate(post.body, 70) || "Community post";
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

export default function PostDetailPage() {
  return <PostDetailView />;
}
