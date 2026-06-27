import { createHash } from "crypto";
import { NextResponse } from "next/server";

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 60;
const MAX_TRACKED_KEYS = 5000;
const SHARED_RATE_LIMIT_TIMEOUT_MS = Number(process.env.RATE_LIMIT_SHARED_TIMEOUT_MS || 700);

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function getStore() {
  if (!globalThis.__soldierhubRateLimitStore) {
    globalThis.__soldierhubRateLimitStore = new Map();
  }

  return globalThis.__soldierhubRateLimitStore;
}

function getClientIp(request) {
  // Trusted Vercel header first.
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] || "unknown";
  }

  // Fallback to the RIGHTMOST forwarded IP (closest trusted proxy).
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    return parts[parts.length - 1] || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getHashSecret() {
  return (
    process.env.RATE_LIMIT_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SOLDIERHUB_RATE_LIMIT_SECRET ||
    "soldierhub-rate-limit-fallback"
  );
}

function hashIdentifier(value) {
  return createHash("sha256")
    .update(`${getHashSecret()}:${String(value || "unknown")}`)
    .digest("hex")
    .slice(0, 40);
}

function cleanupExpiredEntries(store, now) {
  if (store.size < MAX_TRACKED_KEYS) return;

  for (const [key, bucket] of store.entries()) {
    if (!bucket?.resetAt || bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function unavailableRateLimitResult(reason = "shared_rate_limiter_unavailable") {
  const resetAt = Date.now() + 30 * 1000;

  return {
    allowed: false,
    limit: 0,
    remaining: 0,
    retryAfter: 30,
    resetAt,
    source: "unavailable",
    status: 503,
    error: "Traffic protection is temporarily unavailable. Please try again shortly.",
    reason,
    headers: {
      "X-RateLimit-Limit": "0",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      "X-RateLimit-Source": "unavailable",
    },
  };
}

function checkInMemoryRateLimit(
  request,
  {
    keyPrefix = "global",
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  } = {}
) {
  const store = getStore();
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${hashIdentifier(ip)}`;

  cleanupExpiredEntries(store, now);

  const existingBucket = store.get(key);
  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  store.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const allowed = bucket.count <= limit;

  return {
    allowed,
    limit,
    remaining,
    retryAfter,
    resetAt: bucket.resetAt,
    source: "memory",
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
      "X-RateLimit-Source": "memory",
    },
  };
}

function getUpstashConfig() {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ""
  ).replace(/\/+$/, "");

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "";

  if (!url || !token) return null;
  return { url, token };
}

async function runUpstashPipeline(commands) {
  const config = getUpstashConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHARED_RATE_LIMIT_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Rate limit store returned ${response.status}`);
    }

    const payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error("Rate limit store returned an invalid response.");
    }

    const commandError = payload.find((entry) => entry?.error);
    if (commandError) {
      throw new Error(commandError.error || "Rate limit store command failed.");
    }

    return payload.map((entry) => entry?.result);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSharedRateLimit(
  request,
  {
    keyPrefix = "global",
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  } = {}
) {
  const now = Date.now();
  const bucketId = Math.floor(now / windowMs);
  const resetAt = (bucketId + 1) * windowMs;
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
  const identifier = hashIdentifier(getClientIp(request));
  const key = `rl:${keyPrefix}:${identifier}:${bucketId}`;
  const ttlMs = Math.max(windowMs * 2, 1000);

  const results = await runUpstashPipeline([
    ["INCR", key],
    ["PEXPIRE", key, ttlMs],
  ]);

  if (!results) return null;

  const count = Math.max(0, Number(results[0]) || 0);
  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;

  return {
    allowed,
    limit,
    remaining,
    retryAfter,
    resetAt,
    source: "upstash",
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      "X-RateLimit-Source": "upstash",
    },
  };
}

export function rateLimitResponse(result = {}) {
  const retryAfter = Math.max(1, Number(result.retryAfter) || 30);
  const status = Number(result.status) || 429;

  return NextResponse.json(
    {
      error: result.error || "Too many requests. Please slow down and try again.",
      retryAfter,
      reason: result.reason || null,
    },
    {
      status,
      headers: {
        ...(result.headers || {}),
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function checkRateLimit(request, options = {}) {
  const hasSharedStore = Boolean(getUpstashConfig());

  if (!hasSharedStore) {
    if (isProductionRuntime()) {
      return unavailableRateLimitResult("missing_shared_rate_limiter_config");
    }
    return checkInMemoryRateLimit(request, options);
  }

  try {
    const sharedResult = await checkSharedRateLimit(request, options);
    if (sharedResult) return sharedResult;
  } catch (error) {
    console.error("Shared rate limiter failed:", error);
    if (isProductionRuntime()) {
      return unavailableRateLimitResult("shared_rate_limiter_error");
    }
  }

  return checkInMemoryRateLimit(request, options);
}
