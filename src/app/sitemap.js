import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

// Regenerate the sitemap at most once an hour so newly published posts are
// discoverable without rebuilding the site.
export const revalidate = 3600;

// Cap how many post URLs we emit so the sitemap stays well under the 50k-URL
// / 50MB limits and keeps generation fast.
const MAX_POST_URLS = 1000;

const STATIC_ROUTES = [
  { url: SITE_URL, changeFrequency: "daily", priority: 1.0 },
  { url: `${SITE_URL}/resources`, changeFrequency: "weekly", priority: 0.9 },
  { url: `${SITE_URL}/tools/bah`, changeFrequency: "monthly", priority: 0.88 },
  { url: `${SITE_URL}/tools/gates`, changeFrequency: "weekly", priority: 0.88 },
  { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.45 },
  { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.45 },
];

async function getRecentPublicPosts() {
  try {
    const supabase = await createClient();
    if (!supabase) return [];

    // get_public_posts is the security-definer RPC anonymous clients use to read
    // active posts (there is no anon SELECT policy on public.posts). It returns
    // at most 50 rows per call, so page through it with the keyset cursor.
    const collected = [];
    let cursorCreatedAt = null;
    let cursorId = null;

    while (collected.length < MAX_POST_URLS) {
      const { data, error } = await supabase.rpc("get_public_posts", {
        limit_count: 50,
        cursor_created_at: cursorCreatedAt,
        cursor_id: cursorId,
      });

      if (error || !Array.isArray(data) || data.length === 0) break;

      for (const row of data) {
        if (row?.id) collected.push(row);
      }

      const last = data[data.length - 1];
      if (!last?.created_at || !last?.id || data.length < 50) break;
      cursorCreatedAt = last.created_at;
      cursorId = last.id;
    }

    return collected.slice(0, MAX_POST_URLS);
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map((route) => ({ ...route, lastModified: now }));

  const posts = await getRecentPublicPosts();
  const postEntries = posts.map((post) => ({
    url: `${SITE_URL}/post/${post.id}`,
    lastModified: post.updated_at || post.created_at || now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries];
}
