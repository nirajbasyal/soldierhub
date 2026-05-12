const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 60;
const MAX_TRACKED_KEYS = 5000;

function getStore() {
  if (!globalThis.__soldierhubRateLimitStore) {
    globalThis.__soldierhubRateLimitStore = new Map();
  }

  return globalThis.__soldierhubRateLimitStore;
}

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function cleanupExpiredEntries(store, now) {
  if (store.size < MAX_TRACKED_KEYS) return;

  for (const [key, bucket] of store.entries()) {
    if (!bucket?.resetAt || bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
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
  const key = `${keyPrefix}:${ip}`;

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
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
    },
  };
}

export function rateLimitResponse(result) {
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
