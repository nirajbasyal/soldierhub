import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { buildContentSecurityPolicy } from "../src/lib/security/contentSecurityPolicy.mjs";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("the application has one canonical Next.js proxy", () => {
  assert.equal(existsSync(join(root, "proxy.js")), false);
  assert.equal(existsSync(join(root, "src/proxy.js")), true);
  assert.equal(existsSync(join(root, "src/lib/supabase/proxy.js")), false);
});

test("anonymous traffic avoids unnecessary Supabase Auth requests", () => {
  const middleware = read("src/lib/supabase/middleware.js");
  assert.match(middleware, /hasSupabaseAuthCookie\(request\)/);
  assert.match(middleware, /supabase\.auth\.getClaims/);
  assert.match(middleware, /clearSupabaseAuthCookies/);
});

test("follow notifications are database-owned and idempotent", () => {
  const route = read("src/app/api/profiles/follow/route.js");
  assert.doesNotMatch(route, /\.from\(["']notifications["']\)/);

  const migrations = readdirSync(join(root, "supabase/migrations"))
    .filter((name) => name.endsWith("_harden_follow_notifications.sql"));
  assert.equal(migrations.length, 1);

  const migration = read(`supabase/migrations/${migrations[0]}`);
  assert.match(migration, /CREATE UNIQUE INDEX/i);
  assert.match(migration, /SECURITY DEFINER/i);
  assert.match(migration, /ON CONFLICT/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION/i);
});

test("production scripts use a nonce-based strict CSP", () => {
  const policy = buildContentSecurityPolicy({
    nonce: "launch-readiness-nonce",
    isProduction: true,
    supabaseUrl: "https://example.supabase.co",
  });
  const scriptDirective = policy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("script-src "));

  assert.ok(scriptDirective);
  assert.match(scriptDirective, /'nonce-launch-readiness-nonce'/);
  assert.match(scriptDirective, /'strict-dynamic'/);
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'/);
  assert.doesNotMatch(scriptDirective, /'unsafe-eval'/);

  const proxy = read("src/proxy.js");
  assert.match(proxy, /requestHeaders\.set\("x-nonce", nonce\)/);
  assert.match(proxy, /Content-Security-Policy/);
});

test("admin post moderation and deletion use the MFA-gated server route", () => {
  const adminActions = read("src/store/hooks/useAdminActions.js");
  const postsDb = read("src/lib/db/posts.js");
  const route = read("src/app/api/admin/posts/action/route.js");

  assert.doesNotMatch(adminActions, /\.from\(["']posts["']\)/);
  assert.doesNotMatch(postsDb, /supabase\.rpc\(["']restore_reported_post["']/);
  assert.match(postsDb, /\/api\/admin\/posts\/action/);
  assert.match(route, /requireAdminService\(request\)/);
  assert.match(route, /export async function GET\(request\)/);
  assert.match(route, /\.from\("posts"\)[\s\S]*\.eq\("status", "reported"\)/);
  assert.doesNotMatch(route, /\.from\("posts_with_meta"\)/);
});

test("database admin privileges are available only through protected service-role routes", () => {
  const migrationName = readdirSync(join(root, "supabase/migrations")).find((name) =>
    name.endsWith("_enforce_admin_server_boundaries.sql"),
  );
  assert.ok(migrationName, "admin MFA boundary migration is missing");
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(migration, /select coalesce\(auth\.jwt\(\) ->> 'role', ''\) = 'service_role'/);
  assert.match(migration, /board_questions_admin_update[\s\S]*public\.is_admin\(\)/);
  assert.match(migration, /"Admins can update resources"[\s\S]*public\.is_admin\(\)/);
  assert.match(migration, /revoke insert, update, delete on table public\.resources from authenticated/);
  assert.match(migration, /revoke execute on function public\.admin_list_profiles/);
  assert.match(migration, /revoke execute on function public\.restore_reported_post/);
});

test("time-dependent tool output waits for client hydration", () => {
  const gateHours = read("src/components/tools/GateHoursCard.jsx");
  assert.match(gateHours, /useState\(null\)/);
  assert.doesNotMatch(gateHours, /useState\(new Date\(\)\)/);
});
