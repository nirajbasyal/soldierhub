"use client";

import { createClient } from "@/lib/supabase/client";

export async function getProfile(userId) {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

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
  Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k]);

  const { data, error } = await supabase
    .from("profiles")
    .update(allowed)
    .eq("id", userId)
    .select()
    .single();

  return { data, error };
}

export async function adminVerifyProfile(profileId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase.from("profiles").update({ status: "verified" }).eq("id", profileId);
}

export async function adminRejectProfile(profileId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase.from("profiles").update({ status: "rejected" }).eq("id", profileId);
}

// Soft-disable a member by flipping their status to 'rejected'.
// Hard delete (including the auth.users row) requires the service role key
// and must be done from a server-side route — never expose service role
// to the browser. For now, soft-disable is sufficient and reversible.
export async function adminRemoveProfile(profileId) {
  const supabase = createClient();
  if (!supabase) return { error: null };
  return supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", profileId);
}
