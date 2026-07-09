import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

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

test("production CSP does not permit unsafe-eval", () => {
  const config = read("next.config.mjs");
  assert.match(config, /!isProduction \? ["']'unsafe-eval'["'] : ["']["']/);
  assert.doesNotMatch(
    config,
    /script-src[^\n]*'unsafe-eval'/,
    "unsafe-eval must not be unconditionally present in script-src"
  );
});

test("time-dependent tool output waits for client hydration", () => {
  const gateHours = read("src/components/tools/GateHoursCard.jsx");
  assert.match(gateHours, /useState\(null\)/);
  assert.doesNotMatch(gateHours, /useState\(new Date\(\)\)/);
});
