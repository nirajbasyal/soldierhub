import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey =
  process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey =
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const TEST_PASSWORD = "Test-only!Passphrase-2026";

export function requireLocalSupabase() {
  assert.ok(supabaseUrl, "TEST_SUPABASE_URL is required");
  assert.ok(anonKey, "TEST_SUPABASE_ANON_KEY is required");
  assert.ok(serviceRoleKey, "TEST_SUPABASE_SERVICE_ROLE_KEY is required");

  const parsed = new URL(supabaseUrl);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(parsed.hostname),
    `Integration tests refuse to mutate a non-local Supabase project: ${parsed.hostname}`,
  );
}

function client(key, options = {}) {
  requireLocalSupabase();
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    ...options,
  });
}

export function createAdminClient() {
  return client(serviceRoleKey);
}

export function createAnonymousClient() {
  return client(anonKey);
}

export function createSessionClient() {
  return client(anonKey);
}

export async function removeUserByEmail(email) {
  const admin = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    assert.ifError(error);

    const match = data?.users?.find(
      (user) => user.email?.toLowerCase() === String(email).toLowerCase(),
    );
    if (match) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(match.id);
      assert.ifError(deleteError);
      return;
    }

    if (!data?.nextPage || data.users.length < 100) return;
    page += 1;
  }
}

export async function createTestUser({
  prefix = "integration-user",
  email,
  fullName = "Integration Member",
  verificationStatus = "verified",
  role = "user",
} = {}) {
  const admin = createAdminClient();
  const id = randomUUID();
  const resolvedEmail = email || `${prefix}-${id}@soldierhub.test`;

  await removeUserByEmail(resolvedEmail);

  const { data, error } = await admin.auth.admin.createUser({
    id,
    email: resolvedEmail,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      avatar_color: "#314A66",
    },
  });
  assert.ifError(error);
  assert.equal(data.user.id, id);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      email: resolvedEmail,
      personal_email: resolvedEmail,
      verification_status: verificationStatus,
      role,
    })
    .eq("id", id)
    .select("id, full_name, email, personal_email, verification_status, role")
    .single();
  assert.ifError(profileError);

  return {
    id,
    email: resolvedEmail,
    password: TEST_PASSWORD,
    profile,
  };
}

export async function signInTestUser(user) {
  const supabase = createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  assert.ifError(error);
  assert.ok(data.session?.access_token, `No session returned for ${user.email}`);
  return { supabase, session: data.session, user: data.user };
}

export async function deleteTestUsers(users = []) {
  const admin = createAdminClient();
  for (const user of users) {
    if (!user?.id) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error && !/not found/i.test(error.message || "")) throw error;
  }
}

export function getTestSupabaseConfig() {
  requireLocalSupabase();
  return { supabaseUrl, anonKey, serviceRoleKey };
}
