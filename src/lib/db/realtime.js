"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to new active feed posts only.
 *
 * Production note:
 * Do not listen to every UPDATE/DELETE on the posts table from every client.
 * At scale, a broad `event: "*"` listener causes unnecessary websocket traffic
 * and can trigger too many feed reloads across all connected users.
 */
export function subscribeToPosts(callback) {
  const supabase = createClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel("posts-feed-active-inserts")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "posts",
        filter: "status=eq.active",
      },
      (payload) => {
        callback({
          event: payload.eventType,
          post: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMyNotifications(userId, callback) {
  const supabase = createClient();
  if (!supabase || !userId) return () => {};

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
