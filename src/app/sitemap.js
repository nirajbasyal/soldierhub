const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

export default function sitemap() {
  return [
    { url: SITE_URL,                   lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/resources`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/tools/bah`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/tools/gates`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
