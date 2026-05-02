import { moderateContent } from "@/lib/moderation";

/**
 * POST /api/moderate
 * Body: { text: string }
 * Response: { allowed: boolean, reason?: string }
 *
 * Behavior:
 *   - Always runs the local rule-based filter (catches obvious cases fast).
 *   - If MODERATION_API_KEY is set, also calls OpenAI Moderation for nuanced
 *     content. Either filter rejecting blocks the post.
 *
 * To disable AI moderation: leave MODERATION_API_KEY blank.
 */
export async function POST(request) {
  try {
    const { text } = await request.json();
    if (typeof text !== "string") {
      return Response.json(
        { allowed: false, reason: "Invalid request body." },
        { status: 400 }
      );
    }

    // ─── Local rule-based filter ──────────────────────────────────────
    const local = moderateContent(text);
    if (!local.allowed) return Response.json(local);

    // ─── Optional: OpenAI moderation ──────────────────────────────────
    const apiKey = process.env.MODERATION_API_KEY;
    if (apiKey) {
      try {
        const r = await fetch("https://api.openai.com/v1/moderations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ input: text, model: "omni-moderation-latest" }),
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok) {
          const data = await r.json();
          if (data?.results?.[0]?.flagged) {
            return Response.json({
              allowed: false,
              reason: "Content flagged by automated moderation. Please rephrase.",
            });
          }
        }
        // If OpenAI errors, we already passed the local filter — let it through
      } catch {
        // Network/timeout — fail open (local filter already passed)
      }
    }

    return Response.json({ allowed: true });
  } catch (e) {
    return Response.json(
      { allowed: false, reason: "Moderation service error." },
      { status: 500 }
    );
  }
}
