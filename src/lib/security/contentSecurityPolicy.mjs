function loopbackSupabaseSources(value) {
  try {
    const url = new URL(value || "");
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return [];
    if (!["http:", "https:"].includes(url.protocol)) return [];

    const websocketProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${websocketProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy({
  nonce,
  isProduction = process.env.NODE_ENV === "production",
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
} = {}) {
  if (!nonce) throw new Error("A CSP nonce is required.");

  const loopbackSources = loopbackSupabaseSources(supabaseUrl);
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    !isProduction ? "'unsafe-eval'" : "",
    "https://static.cloudflareinsights.com",
  ].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    // React style props and the existing styled-jsx components require inline
    // styles. Scripts use per-request nonces and never need unsafe-inline.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src ${scriptSources.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    [
      "connect-src 'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      ...loopbackSources,
      "https://api.weather.gov",
      "https://*.r2.cloudflarestorage.com",
      "https://*.r2.dev",
      "https://*.ingest.sentry.io",
      "https://*.sentry.io",
      "https://vitals.vercel-insights.com",
      "https://static.cloudflareinsights.com",
    ].join(" "),
    isProduction && loopbackSources.length === 0 ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
