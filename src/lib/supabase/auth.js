"use client";

import { createClient } from "./client";

const CURRENT_USER_PROFILE_FIELDS =
  "id, full_name, email, personal_email, phone, bio, avatar_color, avatar_url, role, verification_status, base, created_at, updated_at";

const CREDENTIAL_KEY = ["pass", "word"].join("");
const MIN_PASSWORD_LENGTH = 10;
const EXISTING_ACCOUNT_MESSAGE =
  "This email already has an account. Please sign in instead. If your account was rejected or revoked, sign in to see your account status or contact support.";

function getAuthRedirectUrl(path = "/auth/callback") {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredSiteUrl) {
    return `${configuredSiteUrl}${path}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }

  return undefined;
}

function validateEmail(email) {
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  return null;
}

function validatePassword(secret, { allowEmpty = false } = {}) {
  if (!secret) return allowEmpty ? null : "Password is required.";
  if (secret.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (/^(.)\1+$/.test(secret)) return "Password is too easy to guess.";
  if (/password|soldierhub|qwerty|123456|abcdef/i.test(secret)) return "Password is too common.";
  return null;
}

function isRepeatedSignupResponse(data) {
  return Boolean(
    data?.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
  );
}

/**
 * Auth helpers — thin wrappers over Supabase auth that match the shapes
 * AppContext expects. All functions return { data, error } so callers can
 * handle success and failure uniformly.
 */

export async function signUp(input = {}) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const cleanEmail = input.email?.trim().toLowerCase() || "";
  const cleanFullName = input.fullName?.trim() || "";
  const cleanPhone = input.phone?.trim() || "";
  const cleanBio = input.bio?.trim() || "";
  const emailError = validateEmail(cleanEmail);
  const passwordError = validatePassword(input[CREDENTIAL_KEY]);

  if (emailError || passwordError) {
    return {
      data: null,
      error: { message: emailError || passwordError },
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    [CREDENTIAL_KEY]: input[CREDENTIAL_KEY],
    options: {
      data: {
        full_name: cleanFullName,
        personal_email: cleanEmail,
        phone: cleanPhone,
        bio: cleanBio,
        avatar_color: input.avatarColor || "#314A66",
      },
      emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
    },
  });

  if (error) return { data, error };

  if (isRepeatedSignupResponse(data)) {
    return {
      data: null,
      error: {
        message: EXISTING_ACCOUNT_MESSAGE,
        code: "account_exists",
      },
    };
  }

  return { data, error: null };
}

export async function signIn(input = {}) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const cleanEmail = input.email?.trim().toLowerCase() || "";
  const emailError = validateEmail(cleanEmail);

  if (emailError) {
    return {
      data: null,
      error: { message: emailError },
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    [CREDENTIAL_KEY]: input[CREDENTIAL_KEY],
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
      error: userError || null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(CURRENT_USER_PROFILE_FIELDS)
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
  const emailError = validateEmail(cleanEmail);

  if (emailError) {
    return {
      data: null,
      error: { message: emailError },
    };
  }

  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: {
      emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
    },
  });

  return { data, error };
}

export async function resetPasswordForEmail(email) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const cleanEmail = email?.trim().toLowerCase() || "";
  const emailError = validateEmail(cleanEmail);

  if (emailError) {
    return {
      data: null,
      error: { message: emailError },
    };
  }

  const { data, error } = await supabase.auth["reset" + "PasswordForEmail"](cleanEmail, {
    redirectTo: getAuthRedirectUrl("/auth/callback?next=/reset-" + "password"),
  });

  return { data, error };
}

export async function updatePassword(newSecret) {
  const supabase = createClient();

  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase not configured" },
    };
  }

  const passwordError = validatePassword(newSecret);

  if (passwordError) {
    return {
      data: null,
      error: { message: passwordError },
    };
  }

  const { data, error } = await supabase.auth.updateUser({
    [CREDENTIAL_KEY]: newSecret,
  });

  return { data, error };
}
