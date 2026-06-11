import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic liveness/health endpoint for uptime monitors and deploy smoke checks.
// Intentionally does not touch the database or reveal configuration details so it
// stays fast and safe to expose publicly.
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "soldierhub",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
