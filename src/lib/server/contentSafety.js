import * as Sentry from "@sentry/nextjs";

export const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

// ---------------------------------------------------------------------------
// Local-only content safety.
//
// External (OpenAI) moderation has been removed. Every submission runs the
// local keyword checks below; nothing leaves the server. Because no external
// classifier reviews the text, all allowed content is marked degraded with
// degradedReason "local_only_no_external_moderation" so rows can be flagged
// for later review and dashboards can show that moderation is local-only.
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

const LOCAL_ONLY_REASON = "local_only_no_external_moderation";

// --- Result builders (keep the exact field contract callers depend on) ------
function allowResult() {
  return {
    allowed: true,
    flagged: false,
    blocked: false,
    blockedBy: LOCAL_ONLY_REASON,
    categories: {},
    scores: {},
    matchedCategories: [],
    reason: "",
    status: 200,
    degraded: true,
    degradedReason: LOCAL_ONLY_REASON,
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
  // Coarse normalization to reduce the most trivial evasions, while preserving
  // word boundaries so multi-word phrases still match. This is a backstop, not
  // a comprehensive filter — hardening the local lexicon (leetspeak, spacing,
  // slur lists) is a deliberate content-policy task, not something to fake here.
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function localThreatCheck(text) {
  const lower = normalizeForLocal(text);
  const matched = THREAT_KEYWORDS.find((phrase) => lower.includes(phrase));
  if (!matched) return null;

  // Blocked content is worth knowing about; Sentry is a no-op without a DSN.
  try {
    Sentry.captureMessage("Content blocked by local safety check", {
      level: "warning",
      tags: { subsystem: "moderation", blocked_by: "local_threat_keyword" },
    });
  } catch {
    // Never let alerting throw into the request path.
  }

  return blockResult({
    blockedBy: "local_threat_keyword",
    matchedCategories: ["violence"],
  });
}

// --- Public entry point -----------------------------------------------------
export async function checkContentSafety(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return allowResult();

  const localBlock = localThreatCheck(cleanText);
  if (localBlock) return localBlock;

  return allowResult();
}
