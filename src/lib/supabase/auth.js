"use client";

import { createClient } from "./client";

/**
 * Auth helpers — thin wrappers over Supabase auth that match the shapes
 * AppContext expects. All functions return { data, error } so callers can
 * handle success and failure uniformly.
 */

export async function signUp({ email, password, fullName, bio, avatarColor }) {
  const supabase = createClient();
  if (!supabase) {
    return { data: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        bio: bio || "",
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
    return { data: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  if (!supabase) return { error: null };

  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const supabase = createClient();
  if (!supabase) return { user: null, profile: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export function onAuthChange(callback) {
  const supabase = createClient();
  if (!supabase) return () => {};

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => subscription.unsubscribe();
}
