"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to realtime updates on the posts table. Returns an unsubscribe fn.
 *
 * Usage in a component:
 *   useEffect(() => {
 *     const unsub = subscribeToPosts(({ event, post }) => { ... });
 *     return () => unsub();
 *   }, []);
 */
export function subscribeToPosts(callback) {
  const supabase = createClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel("posts-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      (payload) => {
        callback({
          event: payload.eventType, // 'INSERT' | 'UPDATE' | 'DELETE'
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
