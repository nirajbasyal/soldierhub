"use client";

import { createClient } from "@/lib/supabase/client";

async function getToken() {
  const supabase = createClient();
  if (!supabase) return { accessToken: null, error: { message: "Supabase is not configured." } };

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    return { accessToken: null, error: error || { message: "Please log in again." } };
  }

  return { accessToken: session.access_token, error: null };
}

async function adminGateAction(payload, fallbackMessage) {
  const { accessToken, error } = await getToken();
  if (error || !accessToken) return { data: null, error };

  const response = await fetch("/api/admin/gates/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { data: null, error: { message: result?.error || fallbackMessage } };
  }

  return { data: result?.data || null, error: null };
}

export async function listGates({ includeInactive = false } = {}) {
  const response = await fetch(`/api/gates${includeInactive ? "?includeInactive=true" : ""}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { data: [], error: { message: result?.error || "Could not load gates." } };
  }

  return { data: result?.data || [], error: null };
}

export function adminCreateGate(gate) {
  return adminGateAction({ action: "create", gate }, "Could not create gate.");
}

export function adminUpdateGate(id, gate) {
  return adminGateAction({ action: "update", id, gate }, "Could not update gate.");
}

export async function adminDeleteGate(id) {
  const result = await adminGateAction({ action: "delete", id }, "Could not delete gate.");
  return { error: result.error };
}
