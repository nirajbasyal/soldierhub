"use client";

import { createClient } from "@/lib/supabase/client";

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

async function runAdminResourceAction(payload, fallbackMessage) {
  const supabase = createClient();
  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase is not configured." },
    };
  }

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    fallbackMessage
  );

  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/admin/resources/action",
    accessToken,
    payload,
    fallbackMessage
  );
}

export async function listResources() {
  const response = await fetch("/api/resources", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    return {
      data: [],
      error: {
        message: result?.error || "Could not load resources.",
      },
    };
  }

  return { data: result?.data || [], error: null };
}

export async function adminCreateResource({
  section,
  title,
  description,
  link,
}) {
  return runAdminResourceAction(
    {
      action: "create",
      resource: { section, title, description, link },
    },
    "Could not create resource."
  );
}

export async function adminUpdateResource(
  id,
  { section, title, description, link }
) {
  return runAdminResourceAction(
    {
      action: "update",
      id,
      resource: { section, title, description, link },
    },
    "Could not update resource."
  );
}

export async function adminDeleteResource(id) {
  const result = await runAdminResourceAction(
    {
      action: "delete",
      id,
    },
    "Could not delete resource."
  );

  return { error: result.error };
}
