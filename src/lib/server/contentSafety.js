import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

export const SAFETY_MESSAGE =
  "This content may violate Soldier Hub community safety rules. Please revise it and try again.";

// ---------------------------------------------------------------------------
// Content safety.
//
// Production can use OpenAI Moderation when OPENAI_API_KEY or MODERATION_API_KEY
// is set. Local checks remain as a fast backstop and as the fallback when no
// external provider is configured.
// ---------------------------------------------------------------------------

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

const EXCESSIVE_LINK_PATTERN = /(?:https?:\/\/|www\.)/gi;
const LOCAL_ONLY_REASON = "local_only_no_external_moderation";
const EXTERNAL_UNAVAILABLE_REASON = "external_moderation_unavailable";
const MODERATION_MODEL = process.env.MODERATION_MODEL || "omni-moderation-latest";

let moderationClient;

function getModerationApiKey() {
  return process.env.OPENAI_API_KEY || process.env.MODERATION_API_KEY || "";
}

function getModerationClient() {
  const apiKey = getModerationApiKey();
  if (!apiKey) return null;
  if (!moderationClient) moderationClient = new OpenAI({ apiKey });
  return moderationClient;
}

// --- Result builders (keep the exact field contract callers depend on) ------
function allowResult({ degraded = false, degradedReason = null, blockedBy = null, categories = {}, scores = {}, matchedCategories = [] } = {}) {
  return {
    allowed: true,
    flagged: false,
    blocked: false,
    blockedBy: blockedBy || degradedReason || null,
    categories,
    scores,
    matchedCategories,
    reason: "",
    status: 200,
    degraded,
    degradedReason,
  };
}

function blockResult({ blockedBy, matchedCategories = [], categories = {}, scores = {} }) {
  return {
    allowed: false,
    flagged: true,
    blocked: true,
    blockedBy,
    categories,
    scores,
    matchedCategories,
    reason: SAFETY_MESSAGE,
    status: 400,
    degraded: false,
    degradedReason: null,
  };
}

// --- Local checks ------------------------------------------------------------
function normalizeForLocal(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}:/.?&=#@+\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function captureModerationWarning(message, tags = {}) {
  try {
    Sentry.captureMessage(message, {
      level: "warning",
      tags: { subsystem: "moderation", ...tags },
    });
  } catch {
    // Never let alerting throw into the request path.
  }
}

function localThreatCheck(text) {
  const lower = normalizeForLocal(text);
  const matched = THREAT_KEYWORDS.find((phrase) => lower.includes(phrase));
  if (!matched) return null;

  captureModerationWarning("Content blocked by local safety check", {
    blocked_by: "local_threat_keyword",
  });

  return blockResult({
    blockedBy: "local_threat_keyword",
    matchedCategories: ["violence"],
  });
}

function localSpamCheck(text) {
  const links = String(text || "").match(EXCESSIVE_LINK_PATTERN) || [];
  if (links.length < 3) return null;

  captureModerationWarning("Content blocked by local spam check", {
    blocked_by: "local_excessive_links",
  });

  return blockResult({
    blockedBy: "local_excessive_links",
    matchedCategories: ["spam"],
  });
}

function getFlaggedCategories(result = {}) {
  return Object.entries(result.categories || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

async function externalModerationCheck(text) {
  const client = getModerationClient();
  if (!client) {
    return allowResult({
      degraded: true,
      degradedReason: LOCAL_ONLY_REASON,
      blockedBy: LOCAL_ONLY_REASON,
    });
  }

  try {
    const moderation = await client.moderations.create({
      model: MODERATION_MODEL,
      input: text,
    });

    const result = moderation?.results?.[0] || {};
    const matchedCategories = getFlaggedCategories(result);

    if (result.flagged) {
      captureModerationWarning("Content blocked by external moderation", {
        blocked_by: "external_moderation",
        model: moderation?.model || MODERATION_MODEL,
      });

      return blockResult({
        blockedBy: "external_moderation",
        matchedCategories,
        categories: result.categories || {},
        scores: result.category_scores || {},
      });
    }

    return allowResult({
      degraded: false,
      degradedReason: null,
      blockedBy: "external_moderation",
      categories: result.categories || {},
      scores: result.category_scores || {},
      matchedCategories,
    });
  } catch (error) {
    captureModerationWarning("External moderation unavailable", {
      blocked_by: EXTERNAL_UNAVAILABLE_REASON,
      error_name: error?.name || "unknown",
    });

    return allowResult({
      degraded: true,
      degradedReason: EXTERNAL_UNAVAILABLE_REASON,
      blockedBy: EXTERNAL_UNAVAILABLE_REASON,
    });
  }
}

// --- Public entry point -----------------------------------------------------
export async function checkContentSafety(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return allowResult();

  const localBlock = localThreatCheck(cleanText) || localSpamCheck(cleanText);
  if (localBlock) return localBlock;

  return externalModerationCheck(cleanText);
}
