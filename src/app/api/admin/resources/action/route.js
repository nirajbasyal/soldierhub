import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { requireAdmin } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["create", "update", "delete"]);
const MAX_SECTION_LENGTH = 80;
const MAX_TITLE_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 1200;
const MAX_LINK_LENGTH = 500;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeResourceInput(input = {}) {
  return {
    section: cleanText(input.section),
    title: cleanText(input.title),
    description: cleanText(input.description),
    link: cleanText(input.link),
  };
}

function validateResourceInput({ section, title, description, link }) {
  if (!section) return "Section is required.";
  if (!title) return "Title is required.";
  if (!description) return "Description is required.";

  if (section.length > MAX_SECTION_LENGTH) {
    return `Section must be ${MAX_SECTION_LENGTH} characters or less.`;
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or less.`;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`;
  }

  if (link.length > MAX_LINK_LENGTH) {
    return `Link must be ${MAX_LINK_LENGTH} characters or less.`;
  }

  if (link && !/^https?:\/\//i.test(link)) {
    return "Resource link must start with http:// or https://.";
  }

  return null;
}

async function runResourceAction({ supabase, action, id, resource }) {
  if (action === "create") {
    return supabase.from("resources").insert([resource]).select().single();
  }

  if (action === "update") {
    return supabase
      .from("resources")
      .update({ ...resource, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }

  const { error } = await supabase.from("resources").delete().eq("id", id);
  return { data: { id }, error };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "admin-resources-action-ip",
    limit: 80,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, code: admin.code || "ADMIN_REQUIRED" },
      { status: admin.status, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `admin-resources-action-user-${admin.user.id}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid admin resource request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const action = cleanText(requestBody?.action).toLowerCase();
  const id = cleanText(requestBody?.id);

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Invalid admin resource action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (["update", "delete"].includes(action) && !id) {
    return NextResponse.json(
      { error: "Resource id is required for this action." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const resource = normalizeResourceInput(requestBody?.resource || requestBody || {});

  if (action !== "delete") {
    const validationError = validateResourceInput(resource);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }
  }

  const { data, error } = await runResourceAction({
    supabase: admin.supabase,
    action,
    id,
    resource,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Admin resource action failed." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
