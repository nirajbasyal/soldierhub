"use client";

import { createClient } from "@/lib/supabase/client";

export async function getProfile(userId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
}

export async function listVerifiedProfiles() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "verified")
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function listPendingProfiles() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

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
    .select()
    .maybeSingle();

  return { data, error };
}

export async function adminVerifyProfile(profileId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { error } = await supabase
    .from("profiles")
    .update({
      status: "verified",
      verification_status: "verified",
    })
    .eq("id", profileId);

  return { error };
}

export async function adminRejectProfile(profileId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { error } = await supabase.rpc("admin_reject_profile", {
    p_profile_id: profileId,
  });

  return { error };
}

export async function adminRemoveProfile(profileId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { error } = await supabase.rpc("admin_revoke_profile", {
    p_profile_id: profileId,
  });

  return { error };
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
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const cleanEmail = email?.trim().toLowerCase() || "";

  const { data, error } = await supabase.rpc("admin_verify_profile_by_email", {
    p_email: cleanEmail,
  });

  return {
    data: data?.[0] || null,
    error,
  };
}
export async function listBlockedProfiles() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("status", ["rejected", "revoked"])
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function adminRevokeProfileByEmail(email) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const cleanEmail = email?.trim().toLowerCase() || "";

  const { data, error } = await supabase.rpc("admin_revoke_profile_by_email", {
    p_email: cleanEmail,
  });

  return {
    data: data?.[0] || null,
    error,
  };
}