"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for use in Client Components.
 * Reads cookies via the browser; the auth session is shared across tabs.
 *
 * Returns null when env vars are missing — callers must handle this for
 * graceful demo-mode fallback.
 */
let _client = null;

export function createClient() {
  if (_client) return _client;
  if (!isSupabaseConfigured()) return null;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _client;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
