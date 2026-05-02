"use client";

import { createClient } from "@/lib/supabase/client";

export async function listMyNotifications(userId) {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, recipient_user_id, actor_user_id, actor_name_cached, type, post_id, post_title_cached, comment_id, read, created_at"
    )
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

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
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("read", false);

  return { count: count || 0, error };
}
