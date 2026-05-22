import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_POST_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_IMAGE_BYTES = 700 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  return profile?.status || profile?.verification_status || "pending";
}

function cleanPublicUrl(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getExtension(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return "webp";
}

function makeSafePurpose(value) {
  return value === "avatar" ? "avatars" : "posts";
}

function createObjectKey({ purpose, userId, contentType }) {
  const folder = makeSafePurpose(purpose);
  const extension = getExtension(contentType);
  const randomValue = crypto.randomUUID();
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${folder}/${year}/${month}/${userId}/${randomValue}.${extension}`;
}

async function readUploadForm(request) {
  let form;

  try {
    form = await request.formData();
  } catch {
    throw new Error("Invalid image upload form.");
  }

  const file = form.get("file");
  const purpose = form.get("purpose") === "avatar" ? "avatar" : "post";
  const width = Number(form.get("width") || 0) || null;
  const height = Number(form.get("height") || 0) || null;

  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Image file was not included.");
  }

  const contentType = String(file.type || "").toLowerCase();
  const size = Number(file.size || 0);
  const maxBytes = purpose === "avatar" ? MAX_AVATAR_IMAGE_BYTES : MAX_POST_IMAGE_BYTES;

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Only JPG, PNG, and WebP images are supported.");
  }

  if (!size || size > maxBytes) {
    throw new Error(`Compressed ${purpose} image is too large.`);
  }

  return { file, purpose, contentType, size, width, height };
}

export async function POST(request) {
  const ipRateLimit = checkRateLimit(request, {
    keyPrefix: "media:r2-upload:ip",
    limit: 45,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) return rateLimitResponse(ipRateLimit);

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Please log in again before uploading an image." },
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Please log in again before uploading an image." },
      { status: 401, headers: { ...ipRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const userRateLimit = checkRateLimit(request, {
    keyPrefix: `media:r2-upload:user:${user.id}`,
    limit: 25,
    windowMs: 10 * 60 * 1000,
  });

  if (!userRateLimit.allowed) return rateLimitResponse(userRateLimit);

  let upload;
  try {
    upload = await readUploadForm(request);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Invalid image upload request." },
      { status: 400, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, status, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Server R2 upload profile lookup failed:", profileError);
    return NextResponse.json(
      { error: "Could not verify your profile. Please try again." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  if (!profile || getProfileStatus(profile) !== "verified") {
    return NextResponse.json(
      { error: "Your profile must be verified before uploading images." },
      { status: 403, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const r2Client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = cleanPublicUrl(process.env.R2_PUBLIC_URL);

  if (!r2Client || !bucket || !publicBaseUrl) {
    return NextResponse.json(
      { error: "R2 upload is not fully configured." },
      { status: 503, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  const key = createObjectKey({
    purpose: upload.purpose,
    userId: user.id,
    contentType: upload.contentType,
  });

  try {
    const arrayBuffer = await upload.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: upload.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (error) {
    console.error("Server R2 upload failed:", error);
    return NextResponse.json(
      { error: "R2 upload failed on the server. Check R2 token permissions and bucket name." },
      { status: 500, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      url: `${publicBaseUrl}/${key}`,
      key,
      width: upload.width,
      height: upload.height,
      size: upload.size,
    },
    { status: 200, headers: { ...userRateLimit.headers, "Cache-Control": "no-store" } }
  );
}
