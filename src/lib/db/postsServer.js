// Server-only module: it imports the cookies-based Supabase server client,
// which relies on next/headers and therefore cannot be used in the browser.
import { createClient } from "@/lib/supabase/server";
import { normalizePostRow } from "@/lib/db/postNormalize";

const DEFAULT_FEED_LIMIT = 20;

/**
 * Server-side fetch of the first page of public posts for SSR.
 *
 * Uses the security-definer get_public_posts RPC — the same anonymous read
 * path the client feed and sitemap use — so logged-out crawlers receive real
 * post content in the initial HTML. Anonymous-author posts come back with
 * masked author_id/name from the RPC, matching the client behavior.
 *
 * Always resolves to an array; never throws, so a Supabase hiccup degrades to
 * the existing client-side hydration rather than failing the page render.
 */
export async function listPublicPostsServer({ limit = DEFAULT_FEED_LIMIT } = {}) {
  try {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase.rpc("get_public_posts", {
      limit_count: limit,
    });

    if (error || !Array.isArray(data)) return [];

    return data
      .filter((row) => row?.id && (row.status === "active" || row.status === "reported"))
      .map(normalizePostRow);
  } catch {
    return [];
  }
}
