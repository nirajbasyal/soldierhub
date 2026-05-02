import { moderateContent } from "./moderation";

/**
 * Moderate text by calling the /api/moderate endpoint.
 *
 * Tries the API first (which combines local rules + optional OpenAI moderation).
 * Falls back to local-only moderation if the API is unreachable, so users can
 * still post when the network is flaky.
 *
 * Returns { allowed: boolean, reason?: string }.
 */
export async function moderateAsync(text) {
  try {
    const r = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      return await r.json();
    }
    // API errored — fall through to local
  } catch {
    // Network error / timeout — fall through to local
  }
  return moderateContent(text);
}
