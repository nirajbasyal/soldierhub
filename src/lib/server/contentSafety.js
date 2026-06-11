import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

export const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

export const MODERATION_UNAVAILABLE_MESSAGE =
  "Content safety checks are temporarily unavailable. Please try again shortly.";

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

const FAILURE_THRESHOLD = 4;
const COOLDOWN_MS = 30 * 1000;
const SUSTAINED_FAILURE_MS = 60 * 1000;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const OPENAI_TIMEOUT_MS = 4000;

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function getBreakerState() {
  if (!globalThis.__soldierhubModerationBreaker) {
    globalThis.__soldierhubModerationBreaker = {
      consecutiveFailures: 0,
      circuitOpenUntil: 0,
      firstFailureAt: 0,
      lastAlertAt: 0,
    };
  }
  return globalThis.__soldierhubModerationBreaker;
}

function recordSuccess() {
  const state = getBreakerState();
  state.consecutiveFailures = 0;
  state.circuitOpenUntil = 0;
  state.firstFailureAt = 0;
}

function recordFailure(reason, error) {
  const state = getBreakerState();
  const now = Date.now();

  state.consecutiveFailures += 1;
  if (!state.firstFailureAt) state.firstFailureAt = now;

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.circuitOpenUntil = now + COOLDOWN_MS;
  }

  maybeAlertModerationFailure({ state, now, reason, error });
}

function isCircuitOpen() {
  const state = getBreakerState();
  if (!state.circuitOpenUntil) return false;

  if (Date.now() >= state.circuitOpenUntil) {
    state.circuitOpenUntil = 0;
    return false;
  }

  return true;
}

function maybeAlertModerationFailure({ state, now, reason, error, force = false }) {
  const failingFor = state.firstFailureAt ? now - state.firstFailureAt : 0;
  const sustained =
    force ||
    (state.consecutiveFailures >= FAILURE_THRESHOLD &&
      failingFor >= SUSTAINED_FAILURE_MS);

  if (!sustained) return;
  if (now - state.lastAlertAt < ALERT_COOLDOWN_MS) return;

  state.lastAlertAt = now;

  try {
    Sentry.captureMessage("Content moderation unavailable", {
      level: "error",
      tags: { subsystem: "moderation", reason: reason || "unknown" },
      extra: {
        consecutiveFailures: state.consecutiveFailures,
        failingForMs: failingFor,
        lastError: error?.message || String(error || ""),
        failClosed: isProductionRuntime(),
      },
    });
  } catch {
    // Never let alerting throw into the request path.
  }
}

function allowResult({ degraded = false, degradedReason = null } = {}) {
  return {
    allowed: true,
    flagged: false,
    blocked: false,
    blockedBy: degraded ? degradedReason : null,
    categories: {},
    scores: {},
    matchedCategories: [],
    reason: "",
    status: 200,
    degraded,
    degradedReason: degraded ? degradedReason : null,
  };
}

function blockResult({ blockedBy, matchedCategories = [], categories = {}, scores = {}, reason = SAFETY_MESSAGE, status = 400 }) {
  return {
    allowed: false,
    flagged: true,
    blocked: true,
    blockedBy,
    categories,
    scores,
    matchedCategories,
    reason,
    status,
    degraded: false,
    degradedReason: null,
  };
}

function moderationUnavailableResult(blockedBy) {
  return blockResult({
    blockedBy,
    matchedCategories: ["moderation_unavailable"],
    reason: MODERATION_UNAVAILABLE_MESSAGE,
    status: 503,
  });
}

function normalizeForLocal(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function localThreatCheck(text) {
  const lower = normalizeForLocal(text);
  const matched = THREAT_KEYWORDS.find((phrase) => lower.includes(phrase));
  if (!matched) return null;
  return blockResult({
    blockedBy: "local_threat_keyword",
    matchedCategories: ["violence"],
  });
}

async function runOpenAiModeration(apiKey, cleanText) {
  const openai = new OpenAI({ apiKey });
  const moderation = await openai.moderations.create(
    { model: "omni-moderation-latest", input: cleanText },
    { timeout: OPENAI_TIMEOUT_MS }
  );

  const result = moderation.results?.[0];
  if (!result) {
    throw new Error("Moderation returned no result");
  }

  const categories = result.categories || {};
  const scores = result.category_scores || {};
  const matchedCategories = Object.entries(categories)
    .filter(([category, flagged]) => flagged && BLOCKED_CATEGORIES.includes(category))
    .map(([category]) => category);

  const blocked = Boolean(result.flagged) || matchedCategories.length > 0;

  if (blocked) {
    return blockResult({
      blockedBy: "openai_moderation",
      matchedCategories,
      categories,
      scores,
    });
  }

  return {
    allowed: true,
    flagged: Boolean(result.flagged),
    blocked: false,
    blockedBy: null,
    categories,
    scores,
    matchedCategories,
    reason: "",
    status: 200,
    degraded: false,
    degradedReason: null,
  };
}

function degradedAllow(reason, error) {
  recordFailure(reason, error);
  return allowResult({
    degraded: true,
    degradedReason: reason,
  });
}

function failClosedModeration(reason, error) {
  recordFailure(reason, error);
  maybeAlertModerationFailure({
    state: getBreakerState(),
    now: Date.now(),
    reason,
    error,
    force: true,
  });
  return moderationUnavailableResult(reason);
}

export async function checkContentSafety(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return allowResult();

  const localBlock = localThreatCheck(cleanText);
  if (localBlock) return localBlock;

  const apiKey = process.env.MODERATION_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("Moderation API key not configured");
    if (isProductionRuntime()) {
      return failClosedModeration("moderation_missing_api_key", error);
    }
    return degradedAllow("local_only_missing_openai_key", error);
  }

  if (isCircuitOpen()) {
    if (isProductionRuntime()) {
      return moderationUnavailableResult("moderation_circuit_open");
    }
    return allowResult({
      degraded: true,
      degradedReason: "local_only_circuit_open",
    });
  }

  try {
    const result = await runOpenAiModeration(apiKey, cleanText);
    recordSuccess();
    return result;
  } catch (error) {
    console.error("Server content safety check failed:", error);
    if (isProductionRuntime()) {
      return failClosedModeration("moderation_api_error", error);
    }
    return degradedAllow("moderation_error_allowed_local_only", error);
  }
}
