import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["create", "update", "delete"]);
const STATUS_TYPES = new Set(["always", "weekday-limited", "closed", "custom"]);
const VALID_DAYS = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const MAX_NAME = 120;
const MAX_LABEL = 80;
const MAX_NOTE = 500;
const MAX_HOURS = 120;
const MAX_STATUS_TEXT = 80;

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function cleanBool(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function cleanTime(value) {
  const text = cleanText(value, 8);
  if (!text) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(text)) return null;
  return text.length === 5 ? `${text}:00` : text;
}

function cleanDays(value) {
  const incoming = Array.isArray(value) ? value : [];
  const days = incoming
    .map((day) => cleanText(day, 12))
    .filter((day) => VALID_DAYS.has(day));

  return Array.from(new Set(days));
}

function normalizeGateInput(input = {}) {
  const statusType = cleanText(input.status_type || input.statusType, 30).toLowerCase() || "always";

  return {
    name: cleanText(input.name, MAX_NAME),
    label: cleanText(input.label, MAX_LABEL) || "Access Gate",
    note: cleanText(input.note, MAX_NOTE),
    hours: cleanText(input.hours, MAX_HOURS) || "24/7",
    status_type: statusType,
    open_time: cleanTime(input.open_time || input.openTime),
    close_time: cleanTime(input.close_time || input.closeTime),
    days: cleanDays(input.days),
    custom_status_text: cleanText(input.custom_status_text || input.customStatusText, MAX_STATUS_TEXT),
    custom_is_open:
      typeof input.custom_is_open === "boolean"
        ? input.custom_is_open
        : typeof input.customIsOpen === "boolean"
        ? input.customIsOpen
        : null,
    is_active: cleanBool(input.is_active ?? input.isActive, true),
    display_order: cleanNumber(input.display_order ?? input.displayOrder, 0),
  };
}

function validateGateInput(gate) {
  if (!gate.name) return "Gate name is required.";
  if (!gate.label) return "Gate label is required.";
  if (!gate.hours) return "Gate hours are required.";
  if (!STATUS_TYPES.has(gate.status_type)) return "Gate status type is invalid.";

  if (gate.status_type === "weekday-limited") {
    if (!gate.days.length) return "Select at least one open day for limited-hour gates.";
    if (!gate.open_time || !gate.close_time) return "Open and close time are required for limited-hour gates.";
  }

  if (gate.status_type === "custom") {
    if (!gate.custom_status_text) return "Custom status text is required for custom gates.";
    if (typeof gate.custom_is_open !== "boolean") return "Choose whether the custom gate is open or closed.";
  }

  return null;
}

async function adminContext(request, prefix) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: prefix,
    limit: 80,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) return { response: rateLimitResponse(rateLimit) };

  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return {
      response: NextResponse.json(
        { error: admin.error },
        { status: admin.status, headers: { ...rateLimit.headers, "Cache-Control": "no-store" } }
      ),
    };
  }

  return { ...admin, headers: rateLimit.headers };
}

const SELECT_FIELDS = "id, name, label, note, hours, status_type, open_time, close_time, days, custom_status_text, custom_is_open, is_active, display_order, created_at, updated_at";

async function runGateAction({ supabase, action, id, gate }) {
  if (action === "create") {
    return supabase.from("gates").insert([gate]).select(SELECT_FIELDS).single();
  }

  if (action === "update") {
    return supabase
      .from("gates")
      .update({ ...gate, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT_FIELDS)
      .single();
  }

  const { data, error } = await supabase
    .from("gates")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  return { data, error };
}

export async function POST(request) {
  const ctx = await adminContext(request, "admin-gates-action");
  if (ctx.response) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid gate admin request." }, { status: 400 });
  }

  const action = cleanText(body?.action, 20).toLowerCase();
  const id = cleanText(body?.id, 80);

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid gate action." }, { status: 400 });
  }

  if (["update", "delete"].includes(action) && !id) {
    return NextResponse.json({ error: "Gate id is required for this action." }, { status: 400 });
  }

  const gate = normalizeGateInput(body?.gate || body || {});

  if (action !== "delete") {
    const validationError = validateGateInput(gate);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  const { data, error } = await runGateAction({
    supabase: ctx.supabase,
    action,
    id,
    gate,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Admin gate action failed." },
      { status: 500, headers: { ...ctx.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data },
    { status: action === "create" ? 201 : 200, headers: { ...ctx.headers, "Cache-Control": "no-store" } }
  );
}
