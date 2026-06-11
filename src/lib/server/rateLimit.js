import { createHash } from "crypto";

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 60;
const MAX_TRACKED_KEYS = 5000;
const SHARED_RATE_LIMIT_TIMEOUT_MS = Number(process.env.RATE_LIMIT_SHARED_TIMEOUT_MS || 700);

// In production we require a shared (Upstash/KV) rate-limit store. The per-instance
// in-memory store is trivially bypassed on serverless (each warm instance keeps its
// own counters), so when the shared store is missing or unreachable in production we
// fail CLOSED (return a 503 via rateLimitResponse) instead of silently allowing the
// request. Outside production we keep the in-memory store for local development.
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function limiterUnavailableResult(limit = DEFAULT_LIMIT) {
  const retryAfter = 5;
  return {
    allowed: false,
    unavailable: true,
    limit,
    remaining: 0,
    retryAfter,
    resetAt: Date.now() + retryAfter * 1000,
    source: "unavailable",
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Source": "unavailable",
    },
  };
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

export async function checkRateLimit(request, options = {}) {
  if (!getUpstashConfig()) {
    // No shared store configured. In production this is a misconfiguration: fail
    // closed rather than fall back to bypassable in-memory limiting.
    if (IS_PRODUCTION) {
      console.error(
        "Shared rate limiter is not configured in production (set UPSTASH_REDIS_REST_URL/_TOKEN); failing closed."
      );
      return limiterUnavailableResult(options.limit);
    }
    return checkInMemoryRateLimit(request, options);
  }

  try {
    const sharedResult = await checkSharedRateLimit(request, options);
    if (sharedResult) return sharedResult;
    // A null result means the shared store could not be reached.
    if (IS_PRODUCTION) return limiterUnavailableResult(options.limit);
  } catch (error) {
    console.error("Shared rate limiter failed:", error);
    if (IS_PRODUCTION) return limiterUnavailableResult(options.limit);
  }

  return checkInMemoryRateLimit(request, options);
}

export function rateLimitResponse(result) {
  // When the shared limiter is unavailable in production we fail closed with 503
  // so the request is rejected rather than allowed without protection.
  if (result.unavailable) {
    return Response.json(
      {
        error: "This action is temporarily unavailable. Please try again shortly.",
        retryAfter: result.retryAfter,
      },
      {
        status: 503,
        headers: {
          ...result.headers,
          "Retry-After": String(result.retryAfter),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return Response.json(
    {
      error: "Too many requests. Please try again shortly.",
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        ...result.headers,
        "Retry-After": String(result.retryAfter),
        "Cache-Control": "no-store",
      },
    }
  );
}
