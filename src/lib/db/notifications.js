"use client";

import { createClient } from "@/lib/supabase/client";

const NOTIFICATION_SELECT =
  "id, recipient_user_id, actor_user_id, actor_name_cached, type, post_id, post_title_cached, comment_id, read, created_at";

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

export async function markAllNotificationsRead(userId) {
  const supabase = createClient();
  if (!supabase) return { error: null };

  return supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_user_id", userId)
    .eq("read", false);
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
