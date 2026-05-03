export async function moderateAsync(text) {
  const cleaned = String(text || "").trim();

  if (!cleaned) {
    return {
      allowed: true,
      flagged: false,
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

    if (!response.ok) {
      return {
        allowed: true,
        flagged: false,
        reason: "",
      };
    }

    const data = await response.json();

    return {
      allowed: data.allowed !== false,
      flagged: Boolean(data.flagged),
      reason: data.reason || "",
      matchedCategories: data.matchedCategories || [],
    };
  } catch {
    return {
      allowed: true,
      flagged: false,
      reason: "",
    };
  }
}