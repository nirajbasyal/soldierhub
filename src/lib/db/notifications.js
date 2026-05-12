"use client";

import { createClient } from "@/lib/supabase/client";

const NOTIFICATION_SELECT =
  "id, recipient_user_id, actor_user_id, actor_name_cached, type, post_id, post_title_cached, comment_id, read, created_at";

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
            ? "You are updating notifications too quickly. Please try again shortly."
            : fallbackMessage),
      },
    };
  }

  return { data: result || null, error: null };
}

export async function listMyNotifications(
  userId,
  { limit = 30, cursorCreatedAt = null, cursorId = null } = {}
) {
  const supabase = createClient();
  if (!supabase || !userId) return { data: [], error: null };

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));

  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;

  return { data: data || [], error };
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  if (!supabase) return { data: null, error: null };

  const { accessToken, error } = await getAccessTokenForApi(
    supabase,
    "Please log in again before updating notifications."
  );

  if (error || !accessToken) return { data: null, error };

  return postJsonToApi(
    "/api/notifications/mark-read",
    accessToken,
    {},
    "Could not update notifications."
  );
}

export async function getUnreadCount(userId) {
  const supabase = createClient();
  if (!supabase) return { count: 0, error: null };

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "estimated", head: true })
    .eq("recipient_user_id", userId)
    .eq("read", false);

  return { count: count || 0, error };
}
