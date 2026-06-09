"use client";

import { createClient } from "@/lib/supabase/client";

export function getVerifiedTotpFactors(factors) {
  const totpFactors = factors?.totp || [];
  return totpFactors.filter((factor) => factor.status === "verified");
}

export async function getAdminMfaState() {
  const supabase = createClient();
  if (!supabase) {
    return {
      currentLevel: "aal1",
      nextLevel: "aal1",
      verifiedTotpFactors: [],
      error: { message: "Supabase is not configured." },
    };
  }

  const [aalResult, factorsResult] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  const verifiedTotpFactors = getVerifiedTotpFactors(factorsResult.data);

  return {
    currentLevel: aalResult.data?.currentLevel || "aal1",
    nextLevel: aalResult.data?.nextLevel || "aal1",
    verifiedTotpFactors,
    error: aalResult.error || factorsResult.error || null,
  };
}

export async function isAdminMfaVerified() {
  const state = await getAdminMfaState();
  return {
    verified: state.currentLevel === "aal2",
    hasVerifiedFactor: state.verifiedTotpFactors.length > 0,
    state,
  };
}
