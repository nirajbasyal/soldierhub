import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODERATION_TIMEOUT_MS = Number(process.env.MODERATION_TIMEOUT_MS || 12000);

function isPreviewOrDevelopment() {
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production";
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeError(error) {
  return {
    name: error?.name || "Error",
    status: error?.status || null,
    code: error?.code || null,
    type: error?.type || null,
    message: String(error?.message || "Unknown moderation error").slice(0, 240),
  };
}

export async function GET(request) {
  if (!isPreviewOrDevelopment()) {
    return NextResponse.json(
      { ok: false, error: "Moderation diagnostics are disabled in production." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "health:moderation",
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const moderationKey = process.env.MODERATION_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const apiKey = moderationKey || openAiKey;

  const basePayload = {
    ok: false,
    service: "soldierhub-moderation",
    vercelEnv: process.env.VERCEL_ENV || null,
    nodeEnv: process.env.NODE_ENV || null,
    hasModerationApiKey: hasValue(moderationKey),
    hasOpenAiApiKey: hasValue(openAiKey),
    selectedKey: hasValue(moderationKey) ? "MODERATION_API_KEY" : hasValue(openAiKey) ? "OPENAI_API_KEY" : null,
    timeoutMs: MODERATION_TIMEOUT_MS,
    timestamp: new Date().toISOString(),
  };

  if (!apiKey) {
    return NextResponse.json(
      { ...basePayload, error: "No moderation API key is configured for this deployment." },
      { status: 503, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: MODERATION_TIMEOUT_MS });
    const response = await openai.moderations.create(
      { model: "omni-moderation-latest", input: "This is a safe Soldier Hub moderation health check." },
      { timeout: MODERATION_TIMEOUT_MS }
    );

    const result = response.results?.[0];

    return NextResponse.json(
      {
        ...basePayload,
        ok: true,
        model: "omni-moderation-latest",
        resultPresent: Boolean(result),
        flagged: Boolean(result?.flagged),
      },
      { status: 200, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ...basePayload,
        error: "OpenAI moderation check failed.",
        openAiError: sanitizeError(error),
      },
      { status: 503, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
    );
  }
}
