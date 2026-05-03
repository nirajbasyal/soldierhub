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

    console.log("Moderation response:", data);

    if (!response.ok || !data) {
      return {
        allowed: true,
        flagged: false,
        blocked: false,
        reason: "",
      };
    }

    return {
      allowed: data.allowed !== false,
      flagged: Boolean(data.flagged),
      blocked: Boolean(data.blocked),
      reason: data.reason || "",
      matchedCategories: data.matchedCategories || [],
    };
  } catch (error) {
    console.error("Moderation client error:", error);

    return {
      allowed: true,
      flagged: false,
      blocked: false,
      reason: "",
    };
  }
}