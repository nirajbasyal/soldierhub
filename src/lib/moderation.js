// Local fallback moderation only.
// Main production moderation should use src/lib/moderation-client.js
// which calls /api/moderate and OpenAI moderation.

export function moderateContent(text) {
  const t = String(text || "").toLowerCase().trim();

  if (!t) {
    return { allowed: true };
  }

  if (t.length < 2) {
    return {
      allowed: false,
      reason: "Content is too short.",
    };
  }

  const blocked = [
    // Direct threats
    "i will kill",
    "i'll kill",
    "i am going to kill",
    "i'm going to kill",
    "im going to kill",
    "kill you",
    "kill u",
    "shoot you",
    "shoot u",
    "stab you",
    "stab u",
    "hurt you",
    "hurt u",
    "beat you",
    "beat u",

    // Self-harm encouragement
    "kill yourself",
    "kys",

    // Security / terrorism
    "terrorist attack",
    "bomb threat",
    "make a bomb",
    "plant a bomb",

    // Privacy / doxxing
    "doxx",
    "ssn",
    "social security number",
    "credit card number",

    // General labels
    "hate speech",
    "explicit threat",
  ];

  const hit = blocked.find((phrase) => t.includes(phrase));

  if (hit) {
    return {
      allowed: false,
      reason:
        "This content may violate SoldierHub community safety rules. Please revise it and try again.",
    };
  }

  return { allowed: true };
}