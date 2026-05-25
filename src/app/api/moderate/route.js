import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { checkContentSafety } from "@/lib/server/contentSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MODERATION_TEXT_LENGTH = 8000;

function getNoStoreHeaders(rateLimitHeaders = {}) {
  return {
    ...rateLimitHeaders,
    "Cache-Control": "no-store",
  };
}

export async function POST(req) {
  const rateLimit = await checkRateLimit(req, {
    keyPrefix: "moderate:ip",
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        allowed: false,
        flagged: false,
        blocked: true,
        blockedBy: "invalid_request",
        reason: "Invalid moderation request.",
      },
      { status: 400, headers: getNoStoreHeaders(rateLimit.headers) }
    );
  }

  const text = String(body?.text || "").trim();

  if (!text) {
    return NextResponse.json(
      {
        allowed: true,
        flagged: false,
        blocked: false,
        reason: "",
      },
      { headers: getNoStoreHeaders(rateLimit.headers) }
    );
  }

  if (text.length > MAX_MODERATION_TEXT_LENGTH) {
    return NextResponse.json(
      {
        allowed: false,
        flagged: true,
        blocked: true,
        blockedBy: "text_too_long",
        reason: "Post is too long. Please shorten it and try again.",
      },
      { status: 400, headers: getNoStoreHeaders(rateLimit.headers) }
    );
  }

  const safety = await checkContentSafety(text);

  return NextResponse.json(
    {
      allowed: Boolean(safety.allowed),
      flagged: Boolean(safety.flagged),
      blocked: Boolean(safety.blocked),
      blockedBy: safety.blockedBy || null,
      categories: safety.categories || {},
      scores: safety.scores || {},
      matchedCategories: safety.matchedCategories || [],
      reason: safety.reason || "",
    },
    { status: safety.allowed ? 200 : 400, headers: getNoStoreHeaders(rateLimit.headers) }
  );
}
