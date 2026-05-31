import { listPublicPostsServer } from "@/lib/db/postsServer";
import HomeFeed from "./HomeFeed";

// Revalidate the server-rendered first page periodically so crawlers and
// first-paint visitors get reasonably fresh content without rebuilding. The
// client feed still reconciles live data + new-post polling on top.
export const revalidate = 60;

export default async function HomePage() {
  const initialPosts = await listPublicPostsServer({ limit: 20 });

  return <HomeFeed initialPosts={initialPosts} />;
}
