import OpenAI from "openai";
import { NextResponse } from "next/server";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

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

    // If OpenAI key is missing, do not block normal posts.
    // Local threat phrases above still block dangerous text.
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is missing. Using local moderation only.");

      return NextResponse.json({
        allowed: true,
        flagged: false,
        blocked: false,
        blockedBy: "local_only_missing_openai_key",
        reason: "",
      });
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

      return NextResponse.json({
        allowed: true,
        flagged: false,
        blocked: false,
        reason: "",
      });
    }

    const categories = result.categories || {};
    const scores = result.category_scores || {};

    const matchedCategories = Object.entries(categories)
      .filter(([category, flagged]) => {
        return flagged && BLOCKED_CATEGORIES.includes(category);
      })
      .map(([category]) => category);

    const blocked = Boolean(result.flagged) || matchedCategories.length > 0;

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