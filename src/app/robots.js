const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/auth/",
          "/compose",
          "/notifications",
          "/pending-review",
          // The signed-in user's own profile (and /profile/[id], the
          // authenticated duplicate of a member page). Public member profiles
          // are indexable under /users/[userId] instead.
          "/profile",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
