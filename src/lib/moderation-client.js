export async function moderateAsync(text) {
  const cleaned = String(text || "").trim();

  if (!cleaned) {
    return {
      allowed: true,
      flagged: false,
      blocked: false,
      reason: "",
    };
  }

  try {
    const response = await fetch("/api/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: cleaned }),
    });

    const data = await response.json().catch(() => null);

    // Temporary debug. Remove after moderation works.
    console.log("Moderation response:", data);

    if (!response.ok) {
      return {
        allowed: false,
        flagged: true,
        blocked: true,
        reason: "Content safety check failed. Please try again in a moment.",
      };
    }

    if (!data) {
      return {
        allowed: false,
        flagged: true,
        blocked: true,
        reason: "Content safety check failed. Please try again in a moment.",
      };
    }

    return {
      allowed: data.allowed === true,
      flagged: Boolean(data.flagged),
      blocked: Boolean(data.blocked),
      reason:
        data.reason ||
        "This content may violate SoldierHub community safety rules. Please revise it and try again.",
      matchedCategories: data.matchedCategories || [],
    };
  } catch (error) {
    console.error("Moderation client error:", error);

    return {
      allowed: false,
      flagged: true,
      blocked: true,
      reason: "Content safety check failed. Please try again in a moment.",
    };
  }
}