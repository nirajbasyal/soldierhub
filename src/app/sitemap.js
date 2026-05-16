const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

export default function sitemap() {
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/resources`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/tools/bah`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/tools/gates`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
  ];
}
