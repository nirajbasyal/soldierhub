"use client";

import { createClient } from "@/lib/supabase/client";

const SELF_PROFILE_FIELDS =
  "id, full_name, email, personal_email, military_email, phone, bio, avatar_color, avatar_url, role, status, verification_status, base, created_at, updated_at";

const ADMIN_PROFILE_FIELDS =
  "id, full_name, email, personal_email, military_email, phone, bio, avatar_color, avatar_url, role, status, verification_status, base, created_at, updated_at";

const DEFAULT_ADMIN_PROFILE_LIMIT = 50;
const MAX_ADMIN_PROFILE_LIMIT = 100;

function cleanLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ADMIN_PROFILE_LIMIT;
  return Math.min(Math.floor(parsed), MAX_ADMIN_PROFILE_LIMIT);
}

async function getAccessTokenForApi(supabase, fallbackMessage) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      accessToken: null,
      error: sessionError || { message: fallbackMessage },
    };
  }

  return { accessToken: session.access_token, error: null };
}

async function postJsonToApi(path, accessToken, payload, fallbackMessage) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: {
        message:
          result?.error ||
          (response.status === 429
            ? "You are doing that too quickly. Please try again shortly."
            : fallbackMessage),
      },
    };
  }

  return { data: result?.data || null, error: null };
}

async function runAdminProfileAction(payload, fallbackMessage) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };

  const { accessToken, error } = await getAccessTokenForApi(supabase, fallbackMessage);
  if (error || !accessToken) return { data: null, error };

  return postJsonToApi("/api/admin/profiles/action", accessToken, payload, fallbackMessage);
}

export async function getProfile(userId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select(SELF_PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
}

export async function listVerifiedProfiles({ limit = DEFAULT_ADMIN_PROFILE_LIMIT } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const safeLimit = cleanLimit(limit);
  const { data, error } = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_FIELDS)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  return { data: data || [], error };
}

export async function listPendingProfiles({ limit = DEFAULT_ADMIN_PROFILE_LIMIT } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const safeLimit = cleanLimit(limit);
  const { data, error } = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_FIELDS)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  return { data: data || [], error };
}

export async function updateMyProfile(userId, updates) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const allowed = {
    full_name: updates.full_name,
    bio: updates.bio,
    avatar_color: updates.avatar_color,
    avatar_url: updates.avatar_url,
  };

  // Strip undefined keys
  Object.keys(allowed).forEach((key) => {
    if (allowed[key] === undefined) delete allowed[key];
  });

  const { data, error } = await supabase
    .from("profiles")
    .update(allowed)
    .eq("id", userId)
    .select(SELF_PROFILE_FIELDS)
    .maybeSingle();

  return { data, error };
}

export async function adminVerifyProfile(profileId) {
  return runAdminProfileAction(
    { action: "verify", profileId },
    "Could not verify profile."
  );
}

export async function adminRejectProfile(profileId) {
  return runAdminProfileAction(
    { action: "reject", profileId },
    "Could not reject profile."
  );
}

export async function adminRemoveProfile(profileId) {
  return runAdminProfileAction(
    { action: "revoke", profileId },
    "Could not revoke profile."
  );
}

export async function requestProfileRereview({ militaryEmail, phone }) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { error } = await supabase.rpc("request_profile_rereview", {
    p_military_email: militaryEmail || "",
    p_phone: phone || "",
  });

  return { error };
}

export async function adminVerifyProfileByEmail(email) {
  return runAdminProfileAction(
    { action: "verify_by_email", email },
    "Could not verify profile by email."
  );
}

export async function listBlockedProfiles({ limit = DEFAULT_ADMIN_PROFILE_LIMIT } = {}) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const safeLimit = cleanLimit(limit);
  const { data, error } = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_FIELDS)
    .in("status", ["rejected", "revoked"])
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  return { data: data || [], error };
}

export async function adminRevokeProfileByEmail(email) {
  return runAdminProfileAction(
    { action: "revoke_by_email", email },
    "Could not revoke profile by email."
  );
}

export async function findProfileByEmailForSearch(email) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: { message: "Supabase is not configured." } };

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!cleanEmail) return { data: null, error: { message: "Enter a valid email." } };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before searching profiles."
  );

  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/profiles/search-by-email",
    accessToken,
    { email: cleanEmail },
    "User not found."
  );
}
