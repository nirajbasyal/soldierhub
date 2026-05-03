import OpenAI from "openai";
import { NextResponse } from "next/server";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
];

export async function POST(req) {
  try {
    const body = await req.json();
    const text = String(body?.text || "").trim();

    if (!text) {
      return NextResponse.json({
        allowed: true,
        flagged: false,
        blocked: false,
        reason: "",
      });
    }

    if (text.length > 8000) {
      return NextResponse.json({
        allowed: false,
        flagged: true,
        blocked: true,
        reason: "Post is too long. Please shorten it and try again.",
      });
    }

    const lowerText = text.toLowerCase();

    const blockedByThreatText = THREAT_KEYWORDS.some((phrase) =>
      lowerText.includes(phrase)
    );

    if (blockedByThreatText) {
      return NextResponse.json({
        allowed: false,
        flagged: true,
        blocked: true,
        blockedBy: "local_threat_keyword",
        matchedCategories: ["violence"],
        reason: SAFETY_MESSAGE,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        allowed: false,
        flagged: true,
        blocked: true,
        blockedBy: "missing_openai_key",
        reason:
          "Content safety check is not configured. Please contact SoldierHub support.",
      });
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const result = moderation.results?.[0];

    if (!result) {
      return NextResponse.json({
        allowed: false,
        flagged: true,
        blocked: true,
        blockedBy: "no_moderation_result",
        reason: "Content safety check failed. Please try again.",
      });
    }

    const categories = result.categories || {};
    const scores = result.category_scores || {};

    const matchedCategories = Object.entries(categories)
      .filter(([category, flagged]) => {
        return flagged && BLOCKED_CATEGORIES.includes(category);
      })
      .map(([category]) => category);

    const blockedByCategory = matchedCategories.length > 0;

    // Extra safety: if OpenAI flags it at all, block it.
    const blocked = Boolean(result.flagged) || blockedByCategory;

    return NextResponse.json({
      allowed: !blocked,
      flagged: Boolean(result.flagged),
      blocked,
      blockedBy: blocked ? "openai_moderation" : null,
      categories,
      scores,
      matchedCategories,
      reason: blocked ? SAFETY_MESSAGE : "",
    });
  } catch (error) {
    console.error("Moderation error:", error);

    return NextResponse.json(
      {
        allowed: false,
        flagged: true,
        blocked: true,
        blockedBy: "moderation_error",
        reason: "Content safety check failed. Please try again in a moment.",
      },
      { status: 200 }
    );
  }
}