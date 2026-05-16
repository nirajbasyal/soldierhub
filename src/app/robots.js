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
          "/profile",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
