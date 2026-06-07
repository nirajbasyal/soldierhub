import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { checkContentSafety } from "@/lib/server/contentSafety";
import { CATEGORIES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POST_SELECT =
  "id, author_id, author_name_cached, author_color_cached, category, body, anonymous, status, edited, created_at, updated_at, image_url, image_key, image_width, image_height, image_size, image_thumbnail_url, image_thumbnail_key, image_thumbnail_width, image_thumbnail_height, image_thumbnail_size, moderation_status, moderation_reason, moderation_checked_at";

const MAX_BODY_LENGTH = 5000;
const MAX_POST_IMAGE_BYTES = 1250 * 1024;
const MAX_POST_THUMBNAIL_BYTES = 400 * 1024;
const VALID_POST_CATEGORIES = new Set(CATEGORIES.filter((category) => category.key !== "All").map((category) => category.key));

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function createAuthedSupabaseClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function getProfileStatus(profile) {
  return profile?.verification_status || "pending";
}

function cleanText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function safeNumber(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(numberValue);
}

function cleanPublicUrl(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function hasSafeObjectKeyShape(key) {
  return Boolean(key && !key.startsWith("/") && !key.includes("..") && /^[a-zA-Z0-9/_=-]+\.(jpe?g|png|webp)$/i.test(key));
}

function isUserPostImageKey(key, userId) {
  if (!hasSafeObjectKeyShape(key) || !userId) return false;
  if (key.startsWith(`posts/${userId}/`)) return true;

  const parts = key.split("/");
  return (
    parts.length >= 5 &&
    parts[0] === "posts" &&
    /^\d{4}$/.test(parts[1]) &&
    /^\d{2}$/.test(parts[2]) &&
    parts[3] === userId
  );
}

function isExpectedPublicUrl(url, key) {
  const publicBaseUrl = cleanPublicUrl(process.env.R2_PUBLIC_URL);
  if (!publicBaseUrl || !url || !key) return false;

  try {
    const parsedUrl = new URL(url);
    const parsedBase = new URL(publicBaseUrl);
    const normalizedPath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));

    return parsedUrl.origin === parsedBase.origin && normalizedPath === key;
  } catch {
    return false;
  }
}

function validateImageOwnership(image, userId) {
  if (!image) return null;

  if (!isUserPostImageKey(image.image_key, userId) || !isExpectedPublicUrl(image.image_url, image.image_key)) {
    return "Post image must be uploaded through SoldierHub before posting.";
  }

  if (image.image_thumbnail_key || image.image_thumbnail_url) {
    if (
      !isUserPostImageKey(image.image_thumbnail_key, userId) ||
      !isExpectedPublicUrl(image.image_thumbnail_url, image.image_thumbnail_key)
    ) {
      return "Post image thumbnail must be uploaded through SoldierHub before posting.";
    }
  }

  return null;
}

function cleanPostCategory(value) {
  const category = cleanText(value, "General Q&A") || "General Q&A";
  return VALID_POST_CATEGORIES.has(category) ? category : null;
}

function getModerationFields(safety) {
  const checkedAt = new Date().toISOString();
  if (safety?.degraded) {
    return {
      moderation_status: "degraded",
      moderation_reason: safety.degradedReason || safety.blockedBy || "moderation_degraded",
      moderation_checked_at: checkedAt,
    };
  }

  return {
    moderation_status: "approved",
    moderation_reason: safety?.blockedBy || null,
    moderation_checked_at: checkedAt,
  };
}

function cleanThumbnailMetadata(value = {}) {
  if (!value || typeof value !== "object") return {};

  const thumbnailUrl = cleanText(value.url || value.image_thumbnail_url);
  const thumbnailKey = cleanText(value.key || value.image_thumbnail_key);
  const thumbnailSize = safeNumber(value.size || value.image_thumbnail_size);
  const thumbnailWidth = safeNumber(value.width || value.image_thumbnail_width);
  const thumbnailHeight = safeNumber(value.height || value.image_thumbnail_height);

  if (!thumbnailUrl && !thumbnailKey) return {};
  if (!thumbnailUrl || !thumbnailKey) throw new Error("Invalid post image thumbnail.");

  if (thumbnailSize && thumbnailSize > MAX_POST_THUMBNAIL_BYTES) {
    throw new Error("Post image thumbnail must be under 400 KB.");
  }

  return {
    image_thumbnail_url: thumbnailUrl,
    image_thumbnail_key: thumbnailKey,
    image_thumbnail_width: thumbnailWidth,
    image_thumbnail_height: thumbnailHeight,
    image_thumbnail_size: thumbnailSize,
  };
}

function cleanImageMetadata(value = {}) {
  if (!value || typeof value !== "object") return null;

  const imageUrl = cleanText(value.url || value.image_url);
  const imageKey = cleanText(value.key || value.image_key);
  const imageSize = safeNumber(value.size || value.image_size);
  const imageWidth = safeNumber(value.width || value.image_width);
  const imageHeight = safeNumber(value.height || value.image_height);
  const thumbnail = cleanThumbnailMetadata(value.thumbnail || value.image_thumbnail || value);

  if (!imageUrl || !imageKey) return null;
  if (imageSize && imageSize > MAX_POST_IMAGE_BYTES) {
    throw new Error("Compressed post image must be under 1.25 MB.");
  }

  return {
    image_url: imageUrl,
    image_key: imageKey,
    image_width: imageWidth,
    image_height: imageHeight,
    image_size: imageSize,
    ...thumbnail,
  };
}

function validatePostInput({ body, image, category }) {
  if (!body && !image?.image_url) return "Please write something or add an image before posting.";
  if (body.length > MAX_BODY_LENGTH) return `Post body must be ${MAX_BODY_LENGTH} characters or less.`;
  if (!category) return "Please choose a valid post category.";
  return null;
}

function normalizeCreatedPost(row = {}) {
  return {
    ...row,
    id: row.id,
    post_id: row.id,
    author_name: row.author_name_cached || "Member",
    author_color: row.author_color_cached || "#314A66",
    upvote_count: 0,
    comment_count: 0,
    report_count: 0,
  };
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "posts:create:ip",
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before posting." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAuthedSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before posting." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = await checkRateLimit(request, {
    keyPrefix: `posts:create:user:${user.id}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let bodyJson;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid post request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  let image = null;
  try {
    image = cleanImageMetadata(bodyJson?.image || bodyJson?.media || null);
  } catch (imageError) {
    return NextResponse.json(
      { error: imageError.message || "Invalid image." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const body = cleanText(bodyJson?.body);
  const category = cleanPostCategory(bodyJson?.category);
  const anonymous = Boolean(bodyJson?.anonymous);

  const validationError = validatePostInput({ body, image, category });

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const imageValidationError = validateImageOwnership(image, user.id);

  if (imageValidationError) {
    return NextResponse.json(
      { error: imageValidationError },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const safety = await checkContentSafety(body);

  if (!safety.allowed) {
    return NextResponse.json(
      { error: safety.reason || "This post could not be submitted." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_color, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Create post profile lookup failed:", profileError);
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before you can post." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const payload = {
    author_id: user.id,
    author_name_cached: profile.full_name || user.email || "Member",
    author_color_cached: profile.avatar_color || "#314A66",
    category,
    body,
    anonymous,
    status: "active",
    edited: false,
    ...getModerationFields(safety),
    ...(image || {}),
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(payload)
    .select(POST_SELECT)
    .single();

  if (error) {
    console.error("Create post API failed:", error);
    return NextResponse.json(
      { error: error.message || "Could not create post." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { post: normalizeCreatedPost(data) },
    { status: 201, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
