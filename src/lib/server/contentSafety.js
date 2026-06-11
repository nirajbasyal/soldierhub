import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

export const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

// ---------------------------------------------------------------------------
// What changed vs. the old version, and why
// ---------------------------------------------------------------------------
// Old behavior: if OpenAI was missing/errored, we logged to console and allowed
// the content. That is "silent fail-open" — a broken API key could leave every
// post unmoderated for days with nobody noticing.
//
// New behavior ("loud soft fail-open"):
//   1. Local checks ALWAYS run first (works even when OpenAI is down).
//   2. OpenAI runs when healthy and its verdict is authoritative.
//   3. When OpenAI fails, we allow content that passes local checks BUT mark the
//      result `degraded: true` so the caller can flag the row for later re-scan.
//   4. A circuit breaker stops hammering a dead API: after N consecutive
//      failures we skip OpenAI for a short cooldown and serve local-only (fast),
//      then send one probe to see if it recovered.
//   5. Sustained failure raises a Sentry alert (deduped) so fail-open is LOUD.
//
// IMPORTANT serverless caveat: the state below lives per warm instance, not
// globally. The circuit breaker is still effective (a failing instance protects
// itself), but cross-instance "sustained failure" detection is approximate. The
// robust upgrade is to keep these counters in the Upstash store already wired up
// for rate limiting — see the NOTE markers below for exactly where that slots in.
// ---------------------------------------------------------------------------

// In production, moderation fails CLOSED: if we cannot get an authoritative verdict
// from OpenAI (missing key, open circuit, or API error) we reject the submission with
// a temporary error instead of allowing unmoderated content onto a Soldier-facing
// feed. Outside production we keep the "degraded allow" behavior so local development
// without a moderation key still works.
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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

// --- Circuit breaker + alert tuning -----------------------------------------
const FAILURE_THRESHOLD = 4; // consecutive failures before the circuit opens
const COOLDOWN_MS = 30 * 1000; // how long to skip OpenAI once the circuit is open
const SUSTAINED_FAILURE_MS = 60 * 1000; // failing longer than this => "sustained"
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // don't re-alert more than once per 5 min
const OPENAI_TIMEOUT_MS = 4000; // give up on a slow call instead of blocking the user

function getBreakerState() {
  // NOTE (Upstash upgrade point): to coordinate across serverless instances,
  // back this object with the shared store instead of globalThis.
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

  maybeAlertSustainedFailure({ state, now, reason, error });
}

function isCircuitOpen() {
  const state = getBreakerState();
  if (!state.circuitOpenUntil) return false;
  // Cooldown elapsed => allow ONE probe through (half-open).
  if (Date.now() >= state.circuitOpenUntil) {
    state.circuitOpenUntil = 0;
    return false;
  }
  return true;
}

function maybeAlertSustainedFailure({ state, now, reason, error }) {
  const failingFor = state.firstFailureAt ? now - state.firstFailureAt : 0;
  const sustained =
    state.consecutiveFailures >= FAILURE_THRESHOLD &&
    failingFor >= SUSTAINED_FAILURE_MS;

  if (!sustained) return;
  if (now - state.lastAlertAt < ALERT_COOLDOWN_MS) return; // dedupe

  state.lastAlertAt = now;

  // Sentry is configured in sentry.server.config.js; if the DSN is unset this
  // is a no-op, so the call is always safe.
  try {
    Sentry.captureMessage(
      "Content moderation degraded: OpenAI unavailable, serving local-only checks",
      {
        level: "error",
        tags: { subsystem: "moderation", degraded_reason: reason || "unknown" },
        extra: {
          consecutiveFailures: state.consecutiveFailures,
          failingForMs: failingFor,
          lastError: error?.message || String(error || ""),
        },
      }
    );
  } catch {
    // Never let alerting throw into the request path.
  }
}

// --- Result builders (keep the exact field contract callers depend on) ------
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
    degraded,
    degradedReason: degraded ? degradedReason : null,
  };
}

// Returned when moderation is unavailable in production. `temporaryFailure` tells
// callers to respond with 503 (try again later) rather than 400 (content rejected).
function unavailableResult(degradedReason) {
  return {
    allowed: false,
    flagged: false,
    blocked: false,
    blockedBy: degradedReason,
    categories: {},
    scores: {},
    matchedCategories: [],
    reason:
      "Posting is temporarily unavailable while we verify content safety. Please try again in a few minutes.",
    degraded: true,
    degradedReason,
    temporaryFailure: true,
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
    degraded: false,
    degradedReason: null,
  };
}

// --- Local checks (always run, even when the circuit is open) ---------------
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
  return blockResult({
    blockedBy: "local_threat_keyword",
    matchedCategories: ["violence"],
  });
}

// --- OpenAI call wrapped with a timeout -------------------------------------
async function runOpenAiModeration(apiKey, cleanText) {
  const openai = new OpenAI({ apiKey });
  const moderation = await openai.moderations.create(
    { model: "omni-moderation-latest", input: cleanText },
    { timeout: OPENAI_TIMEOUT_MS }
  );

  const result = moderation.results?.[0];
  if (!result) {
    // Treat an empty payload as a soft failure so it counts toward the breaker.
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
    degraded: false,
    degradedReason: null,
  };
}

// --- Public entry point -----------------------------------------------------
export async function checkContentSafety(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return allowResult();

  // 1) Local checks ALWAYS run first and can hard-block regardless of OpenAI.
  const localBlock = localThreatCheck(cleanText);
  if (localBlock) return localBlock;

  // 2) No key configured => degraded allow (local-only), surfaced loudly once.
  const apiKey = process.env.MODERATION_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    recordFailure("missing_api_key", new Error("Moderation API key not configured"));
    // Production: fail closed. Dev: degraded allow so local work isn't blocked.
    if (IS_PRODUCTION) return unavailableResult("local_only_missing_openai_key");
    return allowResult({
      degraded: true,
      degradedReason: "local_only_missing_openai_key",
    });
  }

  // 3) Circuit open => skip OpenAI entirely.
  if (isCircuitOpen()) {
    if (IS_PRODUCTION) return unavailableResult("local_only_circuit_open");
    return allowResult({
      degraded: true,
      degradedReason: "local_only_circuit_open",
    });
  }

  // 4) Try OpenAI. Success closes the circuit; failure trips it.
  try {
    const result = await runOpenAiModeration(apiKey, cleanText);
    recordSuccess();
    return result;
  } catch (error) {
    console.error("Server content safety check failed:", error);
    recordFailure("openai_error", error);
    if (IS_PRODUCTION) return unavailableResult("moderation_error");
    return allowResult({
      degraded: true,
      degradedReason: "moderation_error_allowed_local_only",
    });
  }
}
