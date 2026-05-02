// Fresh-launch mode: NO fake users, posts, or comments.
//
// In live mode (Supabase env vars configured), the app reads everything from
// the database and never touches this file. In demo mode (no env vars), the
// app starts empty — sign up the first admin account through the UI to begin.
//
// To seed local development data, sign up real accounts through the app and
// optionally run supabase/seed.sql in your Supabase SQL Editor.

export const SEED_USERS = [];
export const SEED_PENDING = [];
export const SEED_POSTS = [];
