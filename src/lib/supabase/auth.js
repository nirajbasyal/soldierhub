"use client";

import { createClient } from "./client";

/**
 * Auth helpers — thin wrappers over Supabase auth that match the shapes
 * AppContext expects. All functions return { data, error } so callers can
 * handle success and failure uniformly.
 */

export async function signUp({
  email,
  password,
  fullName,
  militaryEmail,
  phone,
  bio,
  avatarColor,
}) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const cleanEmail = email?.trim().toLowerCase() || "";
  const cleanFullName = fullName?.trim() || "";
  const cleanMilitaryEmail = militaryEmail?.trim().toLowerCase() || "";
  const cleanPhone = phone?.trim() || "";
  const cleanBio = bio?.trim() || "";

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: cleanFullName,
        personal_email: cleanEmail,
        military_email: cleanMilitaryEmail,
        phone: cleanPhone,
        bio: cleanBio,
        avatar_color: avatarColor || "#314A66",
      },
      emailRedirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
    },
  });

  return { data, error };
}

export async function signIn({ email, password }) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const cleanEmail = email?.trim().toLowerCase() || "";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  return { data, error };
}

export async function signOut() {
  const supabase = createClient();

  if (!supabase) {
    return {
      error: null,
    };
  }

  const { error } = await supabase.auth.signOut();

  return { error };
}

export async function getCurrentUser() {
  const supabase = createClient();

  if (!supabase) {
    return {
      user: null,
      profile: null,
      error: { message: "Supabase not configured" },
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      error: userError,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile || null,
    error: profileError || null,
  };
}

export function onAuthChange(callback) {
  const supabase = createClient();

  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => subscription?.unsubscribe();
}

export async function resendSignupConfirmation(email) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const cleanEmail = email?.trim().toLowerCase() || "";

  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: {
      emailRedirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
    },
  });

  return { data, error };
}