import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { createServiceRoleClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error, code: admin.code || "ADMIN_REQUIRED" },
      { status: admin.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: true, serviceRoleConfigured: false },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

  return NextResponse.json(
    {
      ok: true,
      serviceRoleConfigured: true,
      serviceRoleCanQueryProfiles: !error,
      error: error?.message || null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
