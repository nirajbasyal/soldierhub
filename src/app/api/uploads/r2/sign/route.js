import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["avatars", "posts", "marketplace", "resources", "temp"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 800 * 1024;
const MAX_POST_BYTES = 2 * 1024 * 1024;
const ADMIN_ONLY_FOLDERS = new Set(["resources"]);

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function cleanPublicUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function safeDimension(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(numberValue);
}

function createObjectKey({ folder, userId, contentType }) {
  const extension = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const randomPart = crypto.randomUUID();

  if (folder === "avatars") {
    return `avatars/${userId}/avatar-${Date.now()}-${randomPart}.${extension}`;
  }

  return `${folder}/${userId}/${Date.now()}-${randomPart}.${extension}`;
}

function getMaxBytes(folder) {
  return folder === "avatars" ? MAX_AVATAR_BYTES : MAX_POST_BYTES;
}

export async function POST(request) {
  const ipRateLimit = await checkRateLimit(request, {
    keyPrefix: "uploads:r2-sign:ip",
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 500, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json(
        { error: "Please log in again before uploading an image." },
        { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    const userRateLimit = await checkRateLimit(request, {
      keyPrefix: `uploads:r2-sign:user:${user.id}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,verification_status,role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    if (profile.verification_status !== "verified") {
      return NextResponse.json(
        { error: "Your account must be verified before uploading images." },
        { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const folder = String(body.folder || "").trim();
    const contentType = String(body.contentType || "").trim().toLowerCase();
    const size = Number(body.size || 0);
    const width = safeDimension(body.width);
    const height = safeDimension(body.height);

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: "Invalid upload folder." },
        { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    if (ADMIN_ONLY_FOLDERS.has(folder) && profile.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can upload images to this folder." },
        { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are supported." },
        { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    const maxBytes = getMaxBytes(folder);
    if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
      const maxMb = folder === "avatars" ? "800 KB" : "2 MB";
      return NextResponse.json(
        { error: `Compressed image must be under ${maxMb}.` },
        { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
      );
    }

    const accountId = getRequiredEnv("R2_ACCOUNT_ID");
    const bucket = getRequiredEnv("R2_BUCKET_NAME");
    const publicUrl = cleanPublicUrl(getRequiredEnv("R2_PUBLIC_URL"));

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
      },
    });

    const key = createObjectKey({ folder, userId: user.id, contentType });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });

    return NextResponse.json(
      {
        uploadUrl,
        key,
        publicUrl: `${publicUrl}/${key}`,
        width,
        height,
        maxBytes,
        expectedSize: size,
        expiresIn: 60,
      },
      { headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Could not prepare image upload." },
      { status: 500, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }
}
