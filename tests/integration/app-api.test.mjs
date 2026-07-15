import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";

import {
  createAdminClient,
  createTestUser,
  deleteTestUsers,
  requireLocalSupabase,
  signInTestUser,
} from "./helpers/local-supabase.mjs";

const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "integration-admin@soldierhub.test";
const state = { users: [], postId: null };

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(value).toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of clean) {
    const index = alphabet.indexOf(character);
    assert.notEqual(index, -1, `Invalid base32 character: ${character}`);
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 30_000));
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function jwtPayload(token) {
  const payload = token.split(".")[1];
  assert.ok(payload, "JWT payload is missing");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

async function api(path, { token, body, headers = {}, method = "POST" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

before(async () => {
  requireLocalSupabase();
  const health = await fetch(baseUrl);
  assert.ok(health.ok, `Next.js test server is not reachable at ${baseUrl}`);

  state.verified = await createTestUser({
    prefix: "api-verified",
    fullName: "API Verified Member",
  });
  state.pending = await createTestUser({
    prefix: "api-pending",
    fullName: "API Pending Member",
    verificationStatus: "pending",
  });
  state.admin = await createTestUser({
    email: adminEmail,
    fullName: "Integration Admin",
    role: "admin",
  });
  state.users.push(state.verified, state.pending, state.admin);
});

after(async () => {
  await deleteTestUsers(state.users);
});

test("post and comment routes enforce real auth, verification, moderation, and persistence", async () => {
  const unauthenticated = await api("/api/posts/create", {
    body: { body: "No token", category: "General Q&A" },
  });
  assert.equal(unauthenticated.response.status, 401);

  const { session: pendingSession } = await signInTestUser(state.pending);
  const pending = await api("/api/posts/create", {
    token: pendingSession.access_token,
    body: { body: "Pending bypass", category: "General Q&A" },
  });
  assert.equal(pending.response.status, 403);

  const { session } = await signInTestUser(state.verified);
  const blocked = await api("/api/posts/create", {
    token: session.access_token,
    body: { body: "I will kill you", category: "General Q&A" },
  });
  assert.equal(blocked.response.status, 400);
  assert.match(blocked.payload.error, /community safety rules/i);

  const marker = `API integration post ${Date.now()}`;
  const created = await api("/api/posts/create", {
    token: session.access_token,
    body: {
      body: `<p>${marker}</p>`,
      category: "General Q&A",
      anonymous: false,
    },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  assert.equal(created.payload.post.author_id, state.verified.id);
  assert.equal(created.payload.post.moderation_status, "degraded");
  state.postId = created.payload.post.id;

  const commentMarker = `API integration reply ${Date.now()}`;
  const comment = await api("/api/comments/create", {
    token: session.access_token,
    body: { post_id: state.postId, body: commentMarker },
  });
  assert.equal(comment.response.status, 201, JSON.stringify(comment.payload));
  assert.equal(comment.payload.comment.body, commentMarker);

  const admin = createAdminClient();
  const { data: storedPost, error: postError } = await admin
    .from("posts")
    .select("author_id, body, moderation_status, moderation_checked_at")
    .eq("id", state.postId)
    .single();
  assert.ifError(postError);
  assert.equal(storedPost.author_id, state.verified.id);
  assert.match(storedPost.body, new RegExp(marker));
  assert.equal(storedPost.moderation_status, "degraded");
  assert.ok(storedPost.moderation_checked_at);

  const { data: storedComment, error: commentError } = await admin
    .from("comments")
    .select("author_id, post_id, body")
    .eq("post_id", state.postId)
    .single();
  assert.ifError(commentError);
  assert.deepEqual(storedComment, {
    author_id: state.verified.id,
    post_id: state.postId,
    body: commentMarker,
  });
});

test("upload signing rejects abuse and returns a user-scoped short-lived R2 target", async () => {
  const noToken = await api("/api/media/r2-upload-url", {
    body: { purpose: "post", contentType: "image/png", size: 128 },
  });
  assert.equal(noToken.response.status, 401);

  const { session: pendingSession } = await signInTestUser(state.pending);
  const pending = await api("/api/media/r2-upload-url", {
    token: pendingSession.access_token,
    body: { purpose: "post", contentType: "image/png", size: 128 },
  });
  assert.equal(pending.response.status, 403);

  const { session } = await signInTestUser(state.verified);
  const wrongType = await api("/api/media/r2-upload-url", {
    token: session.access_token,
    body: { purpose: "post", contentType: "image/svg+xml", size: 128 },
  });
  assert.equal(wrongType.response.status, 400);

  const oversized = await api("/api/media/r2-upload-url", {
    token: session.access_token,
    body: { purpose: "post", contentType: "image/png", size: 1_250 * 1024 + 1 },
  });
  assert.equal(oversized.response.status, 400);

  const signed = await api("/api/media/r2-upload-url", {
    token: session.access_token,
    body: {
      purpose: "post",
      contentType: "image/png",
      size: 512,
      width: 32,
      height: 32,
    },
  });
  assert.equal(signed.response.status, 200, JSON.stringify(signed.payload));
  assert.match(signed.payload.key, new RegExp(`^posts/\\d{4}/\\d{2}/${state.verified.id}/.+\\.png$`));
  assert.equal(signed.payload.publicUrl, `https://media.soldierhub.test/${signed.payload.key}`);

  const uploadUrl = new URL(signed.payload.uploadUrl);
  assert.equal(
    uploadUrl.hostname,
    "soldierhub-integration.integration-account.r2.cloudflarestorage.com",
  );
  assert.ok(uploadUrl.searchParams.has("X-Amz-Signature"));
  assert.ok(uploadUrl.searchParams.has("X-Amz-Expires"));
});

test("production routes enforce the shared IP rate limit", async () => {
  const headers = { "x-vercel-forwarded-for": "203.0.113.77" };

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const result = await api("/api/posts/create", {
      headers,
      body: { body: `Rate-limit attempt ${attempt}`, category: "General Q&A" },
    });
    assert.equal(result.response.status, 401, `attempt ${attempt}: ${JSON.stringify(result.payload)}`);
  }

  const blocked = await api("/api/posts/create", {
    headers,
    body: { body: "Rate-limit attempt 21", category: "General Q&A" },
  });
  assert.equal(blocked.response.status, 429, JSON.stringify(blocked.payload));
  assert.equal(blocked.payload.retryAfter > 0, true);
});

test("admin APIs reject AAL1 and accept the same administrator only after real TOTP verification", async () => {
  const { supabase, session } = await signInTestUser(state.admin);
  assert.equal(jwtPayload(session.access_token).aal, "aal1");

  const directProfileRead = await supabase
    .from("profiles")
    .select("id")
    .eq("id", state.verified.id)
    .maybeSingle();
  assert.ifError(directProfileRead.error);
  assert.equal(directProfileRead.data, null, "AAL1 admin inherited database admin read access");

  const directResourceWrite = await supabase.from("resources").insert({
    section: "AAL1 bypass",
    title: "Must not persist",
    description: "Direct admin Data API write without MFA",
    link: "",
  });
  assert.ok(directResourceWrite.error, "AAL1 admin wrote an admin-managed table directly");
  assert.equal(directResourceWrite.error.code, "42501");

  const directAdminRpc = await supabase.rpc("admin_list_profiles", {
    p_queue: "verified",
    p_limit: 5,
  });
  assert.ok(directAdminRpc.error, "AAL1 admin called a server-only SECURITY DEFINER RPC");
  assert.equal(directAdminRpc.error.code, "42501");

  const { error: reportFixtureError } = await supabase.rpc("toggle_post_report", {
    p_post_id: state.postId,
    p_reason: "Integration moderation fixture",
  });
  assert.ifError(reportFixtureError);

  const adminDb = createAdminClient();

  const beforeMfa = await api("/api/admin/profiles/list", {
    token: session.access_token,
    body: { queue: "verified", limit: 5 },
  });
  assert.equal(beforeMfa.response.status, 403);
  assert.equal(beforeMfa.payload.code, "ADMIN_MFA_REQUIRED");

  const restoreBeforeMfa = await api("/api/admin/posts/action", {
    token: session.access_token,
    body: { action: "restore", postId: state.postId },
  });
  assert.equal(restoreBeforeMfa.response.status, 403);
  assert.equal(restoreBeforeMfa.payload.code, "ADMIN_MFA_REQUIRED");

  const reportsBeforeMfa = await api("/api/admin/posts/action", {
    token: session.access_token,
    method: "GET",
  });
  assert.equal(reportsBeforeMfa.response.status, 403);
  assert.equal(reportsBeforeMfa.payload.code, "ADMIN_MFA_REQUIRED");

  const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CI authenticator",
  });
  assert.ifError(enrollError);
  assert.ok(enrollment.id && enrollment.totp?.secret);

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: enrollment.id,
  });
  assert.ifError(challengeError);

  const { data: verifiedMfa, error: verifyError } = await supabase.auth.mfa.verify({
    factorId: enrollment.id,
    challengeId: challenge.id,
    code: totpCode(enrollment.totp.secret),
  });
  assert.ifError(verifyError);

  const aal2Token =
    verifiedMfa?.access_token ||
    verifiedMfa?.session?.access_token ||
    (await supabase.auth.getSession()).data.session?.access_token;
  assert.ok(aal2Token, "MFA verification did not return an access token");
  assert.equal(jwtPayload(aal2Token).aal, "aal2");

  const afterMfa = await api("/api/admin/profiles/list", {
    token: aal2Token,
    body: { queue: "verified", limit: 5 },
  });
  assert.equal(afterMfa.response.status, 200, JSON.stringify(afterMfa.payload));
  assert.ok(Array.isArray(afterMfa.payload.data));

  const directAdminRpcAfterMfa = await supabase.rpc("admin_list_profiles", {
    p_queue: "verified",
    p_limit: 5,
  });
  assert.ok(
    directAdminRpcAfterMfa.error,
    "AAL2 browser session bypassed the protected admin profile route",
  );
  assert.equal(directAdminRpcAfterMfa.error.code, "42501");

  const directResourceWriteAfterMfa = await supabase.from("resources").insert({
    section: "AAL2 bypass",
    title: "Must not persist",
    description: "Direct admin Data API write after MFA",
    link: "",
  });
  assert.ok(
    directResourceWriteAfterMfa.error,
    "AAL2 browser session inherited database administrator privileges",
  );
  assert.equal(directResourceWriteAfterMfa.error.code, "42501");

  const reportsAfterMfa = await api("/api/admin/posts/action", {
    token: aal2Token,
    method: "GET",
  });
  assert.equal(reportsAfterMfa.response.status, 200, JSON.stringify(reportsAfterMfa.payload));
  assert.ok(
    reportsAfterMfa.payload.data.some((post) => post.id === state.postId),
    "protected moderation queue did not return the reported fixture",
  );

  const restored = await api("/api/admin/posts/action", {
    token: aal2Token,
    body: { action: "restore", postId: state.postId },
  });
  assert.equal(restored.response.status, 200, JSON.stringify(restored.payload));

  const { data: restoredPost, error: restoredReadError } = await adminDb
    .from("posts")
    .select("status, report_count")
    .eq("id", state.postId)
    .single();
  assert.ifError(restoredReadError);
  assert.deepEqual(restoredPost, { status: "active", report_count: 0 });

  const deleted = await api("/api/admin/posts/action", {
    token: aal2Token,
    body: { action: "delete", postId: state.postId },
  });
  assert.equal(deleted.response.status, 200, JSON.stringify(deleted.payload));

  const { data: missingPost, error: missingPostError } = await adminDb
    .from("posts")
    .select("id")
    .eq("id", state.postId)
    .maybeSingle();
  assert.ifError(missingPostError);
  assert.equal(missingPost, null);
});
