import OpenAI from "openai";
import { NextResponse } from "next/server";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_STORE_KEY = "__soldierhub_moderation_rate_limit__";

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

function getClientIp(req) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for") || "";

  return (
    vercelForwardedFor.split(",")[0]?.trim() ||
    forwardedFor.split(",")[0]?.trim() ||
    realIp.trim() ||
    "unknown"
  );
}

function getRateLimitStore() {
  if (!globalThis[RATE_LIMIT_STORE_KEY]) {
    globalThis[RATE_LIMIT_STORE_KEY] = new Map();
  }

  return globalThis[RATE_LIMIT_STORE_KEY];
}

function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const store = getRateLimitStore();
  const current = store.get(ip);

  if (!current || now > current.resetAt) {
    store.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(ip, current);

  return {
    allowed: true,
    remaining: Math.max(RATE_LIMIT_MAX_REQUESTS - current.count, 0),
    resetAt: current.resetAt,
  };
}

function rateLimitHeaders(result) {
  const retryAfterSeconds = Math.max(
    Math.ceil((result.resetAt - Date.now()) / 1000),
    1
  );

  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "Retry-After": String(retryAfterSeconds),
  };
}

export async function POST(req) {
  try {
    const rateLimit = checkRateLimit(req);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          flagged: false,
          blocked: true,
          blockedBy: "rate_limit",
          reason: "Too many moderation requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit),
        }
      );
    }

    const body = await req.json();
    const text = String(body?.text || "").trim();

    if (!text) {
      return NextResponse.json(
        {
          allowed: true,
          flagged: false,
          blocked: false,
          reason: "",
        },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    if (text.length > 8000) {
      return NextResponse.json(
        {
          allowed: false,
          flagged: true,
          blocked: true,
          reason: "Post is too long. Please shorten it and try again.",
        },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    const lowerText = text.toLowerCase();

    const blockedByThreatText = THREAT_KEYWORDS.some((phrase) =>
      lowerText.includes(phrase)
    );

    if (blockedByThreatText) {
      return NextResponse.json(
        {
          allowed: false,
          flagged: true,
          blocked: true,
          blockedBy: "local_threat_keyword",
          matchedCategories: ["violence"],
          reason: SAFETY_MESSAGE,
        },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    // If OpenAI key is missing, do not block normal posts.
    // Local threat phrases above still block dangerous text.
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is missing. Using local moderation only.");

      return NextResponse.json(
        {
          allowed: true,
          flagged: false,
          blocked: false,
          blockedBy: "local_only_missing_openai_key",
          reason: "",
        },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const result = moderation.results?.[0];

    if (!result) {
      console.warn("No moderation result returned. Allowing normal post.");

      return NextResponse.json(
        {
          allowed: true,
          flagged: false,
          blocked: false,
          reason: "",
        },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    const categories = result.categories || {};
    const scores = result.category_scores || {};

    const matchedCategories = Object.entries(categories)
      .filter(([category, flagged]) => {
        return flagged && BLOCKED_CATEGORIES.includes(category);
      })
      .map(([category]) => category);

    const blocked = Boolean(result.flagged) || matchedCategories.length > 0;

    return NextResponse.json(
      {
        allowed: !blocked,
        flagged: Boolean(result.flagged),
        blocked,
        blockedBy: blocked ? "openai_moderation" : null,
        categories,
        scores,
        matchedCategories,
        reason: blocked ? SAFETY_MESSAGE : "",
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error("Moderation route error:", error);

    // Do not block every normal post if OpenAI temporarily fails.
    // Local threat phrases already ran before this.
    return NextResponse.json(
      {
        allowed: true,
        flagged: false,
        blocked: false,
        blockedBy: "moderation_error_allowed_local_only",
        reason: "",
      },
      { status: 200 }
    );
  }
}
