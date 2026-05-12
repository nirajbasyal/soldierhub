"use client";

const STORAGE_PREFIX = "soldierhub_rate_limit_";

const DEFAULT_LIMITS = {
  post: { max: 5, windowMs: 10 * 60 * 1000 },
  comment: { max: 20, windowMs: 10 * 60 * 1000 },
  report: { max: 10, windowMs: 10 * 60 * 1000 },
  upvote: { max: 120, windowMs: 10 * 60 * 1000 },
  profile_update: { max: 10, windowMs: 10 * 60 * 1000 },
  auth: { max: 10, windowMs: 10 * 60 * 1000 },
};

function getStorageKey(action, identity = "guest") {
  return `${STORAGE_PREFIX}${action}_${identity}`;
}

function readBucket(key) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeBucket(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // If storage is blocked/full, do not break app actions.
  }
}

export function checkClientActionLimit(action, identity, customLimit = null) {
  const limit = customLimit || DEFAULT_LIMITS[action];

  if (!limit || typeof window === "undefined") {
    return { allowed: true, remaining: null, retryAfterMs: 0 };
  }

  const now = Date.now();
  const key = getStorageKey(action, identity || "guest");
  const current = readBucket(key);

  if (!current || now > current.resetAt) {
    const next = {
      count: 1,
      resetAt: now + limit.windowMs,
    };

    writeBucket(key, next);

    return {
      allowed: true,
      remaining: Math.max(limit.max - 1, 0),
      retryAfterMs: 0,
    };
  }

  if (current.count >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(current.resetAt - now, 0),
    };
  }

  const next = {
    ...current,
    count: current.count + 1,
  };

  writeBucket(key, next);

  return {
    allowed: true,
    remaining: Math.max(limit.max - next.count, 0),
    retryAfterMs: 0,
  };
}

export function formatRetryMessage(retryAfterMs) {
  const seconds = Math.ceil((retryAfterMs || 0) / 1000);

  if (seconds <= 60) return `Please wait ${seconds} seconds and try again.`;

  const minutes = Math.ceil(seconds / 60);
  return `Please wait about ${minutes} minutes and try again.`;
}
