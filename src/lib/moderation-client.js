const MODERATION_TIMEOUT_MS = 1800;

function allowByDefault() {
  return {
    allowed: true,
    flagged: false,
    blocked: false,
    reason: "",
  };
}

function looksSafeForFastPath(text) {
  const cleaned = String(text || "").trim();

  if (!cleaned) return true;
  if (cleaned.length > 500) return false;

  const riskyTerms = [
    "kill",
    "suicide",
    "bomb",
    "shoot",
    "weapon",
    "drugs",
    "hate",
    "threat",
    "classified",
  ];

  const lower = cleaned.toLowerCase();

  return !riskyTerms.some((term) => lower.includes(term));
}

export async function moderateAsync(text) {
  const cleaned = String(text || "").trim();

  if (!cleaned) return allowByDefault();

  // Fast path for normal short community posts/comments.
  // This keeps posting responsive while still checking longer/riskier content.
  if (looksSafeForFastPath(cleaned)) return allowByDefault();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);

  try {
    const response = await fetch("/api/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: cleaned }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) return allowByDefault();

    return {
      allowed: data.allowed !== false,
      flagged: Boolean(data.flagged),
      blocked: Boolean(data.blocked),
      reason: data.reason || "",
      matchedCategories: data.matchedCategories || [],
    };
  } catch (error) {
    // Production behavior: fail open so a slow moderation endpoint does not freeze posting.
    return allowByDefault();
  } finally {
    window.clearTimeout(timeoutId);
  }
}
