import OpenAI from "openai";

export const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const BLOCKED_CATEGORIES = [
  "hate",
  "hate/threatening",
  "harassment",
  "harassment/threatening",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "sexual/minors",
  "violence",
  "violence/graphic",
  "illicit",
  "illicit/violent",
];

const THREAT_KEYWORDS = [
  "i will kill",
  "i'll kill",
  "i am going to kill",
  "i'm going to kill",
  "im going to kill",
  "kill you",
  "kill u",
  "shoot you",
  "shoot u",
  "hurt you",
  "hurt u",
  "beat you",
  "beat u",
  "stab you",
  "stab u",
  "bomb threat",
  "terrorist attack",
  "kill yourself",
];

function localThreatCheck(text) {
  const lowerText = String(text || "").toLowerCase();
  const matchedThreat = THREAT_KEYWORDS.find((phrase) => lowerText.includes(phrase));

  if (!matchedThreat) {
    return {
      allowed: true,
      flagged: false,
      blocked: false,
      blockedBy: null,
      matchedCategories: [],
      reason: "",
    };
  }

  return {
    allowed: false,
    flagged: true,
    blocked: true,
    blockedBy: "local_threat_keyword",
    matchedCategories: ["violence"],
    reason: SAFETY_MESSAGE,
  };
}

export async function checkContentSafety(text) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    return {
      allowed: true,
      flagged: false,
      blocked: false,
      blockedBy: null,
      matchedCategories: [],
      reason: "",
    };
  }

  const localCheck = localThreatCheck(cleanText);
  if (!localCheck.allowed) return localCheck;

  const apiKey = process.env.MODERATION_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("Moderation API key is missing. Server moderation is using local safety checks only.");

    return {
      allowed: true,
      flagged: false,
      blocked: false,
      blockedBy: "local_only_missing_openai_key",
      matchedCategories: [],
      reason: "",
    };
  }

  try {
    const openai = new OpenAI({ apiKey });

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: cleanText,
    });

    const result = moderation.results?.[0];

    if (!result) {
      console.warn("No moderation result returned. Allowing content after local safety checks.");
      return {
        allowed: true,
        flagged: false,
        blocked: false,
        blockedBy: "moderation_empty_allowed_local_only",
        matchedCategories: [],
        reason: "",
      };
    }

    const categories = result.categories || {};
    const scores = result.category_scores || {};
    const matchedCategories = Object.entries(categories)
      .filter(([category, flagged]) => flagged && BLOCKED_CATEGORIES.includes(category))
      .map(([category]) => category);

    const blocked = Boolean(result.flagged) || matchedCategories.length > 0;

    return {
      allowed: !blocked,
      flagged: Boolean(result.flagged),
      blocked,
      blockedBy: blocked ? "openai_moderation" : null,
      categories,
      scores,
      matchedCategories,
      reason: blocked ? SAFETY_MESSAGE : "",
    };
  } catch (error) {
    console.error("Server content safety check failed:", error);

    return {
      allowed: true,
      flagged: false,
      blocked: false,
      blockedBy: "moderation_error_allowed_local_only",
      matchedCategories: [],
      reason: "",
    };
  }
}
