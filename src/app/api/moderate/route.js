import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BLOCKED_CATEGORIES = [
  "hate",
  "hate/threatening",
  "harassment/threatening",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "sexual/minors",
  "violence/graphic",
  "illicit",
  "illicit/violent",
];

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          allowed: true,
          flagged: false,
          reason: "Moderation is not configured.",
        },
        { status: 200 }
      );
    }

    const body = await req.json();
    const text = String(body?.text || "").trim();

    if (!text) {
      return NextResponse.json({
        allowed: true,
        flagged: false,
        reason: "",
      });
    }

    if (text.length > 8000) {
      return NextResponse.json(
        {
          allowed: false,
          flagged: true,
          reason: "Post is too long. Please shorten it and try again.",
        },
        { status: 200 }
      );
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const result = moderation.results?.[0];

    if (!result) {
      return NextResponse.json({
        allowed: true,
        flagged: false,
        reason: "",
      });
    }

    const categories = result.categories || {};
    const scores = result.category_scores || {};

    const matchedCategories = Object.entries(categories)
      .filter(([category, flagged]) => {
        if (!flagged) return false;
        return BLOCKED_CATEGORIES.includes(category);
      })
      .map(([category]) => category);

    const highestScoreCategory = Object.entries(scores).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const blocked = matchedCategories.length > 0;

    return NextResponse.json({
      allowed: !blocked,
      flagged: result.flagged,
      blocked,
      categories,
      scores,
      matchedCategories,
      highestScoreCategory: highestScoreCategory
        ? {
            category: highestScoreCategory[0],
            score: highestScoreCategory[1],
          }
        : null,
      reason: blocked
        ? "This content may violate SoldierHub community safety rules. Please revise it and try again."
        : "",
    });
  } catch (error) {
    console.error("Moderation error:", error);

    return NextResponse.json(
      {
        allowed: true,
        flagged: false,
        reason: "Moderation temporarily unavailable.",
      },
      { status: 200 }
    );
  }
}