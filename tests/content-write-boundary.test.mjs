import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("authenticated Data API roles cannot write post or comment content", () => {
  const migrations = readdirSync(join(root, "supabase/migrations")).filter((name) =>
    name.endsWith("_enforce_moderated_content_writes.sql")
  );

  assert.equal(migrations.length, 1);

  const migration = read(`supabase/migrations/${migrations[0]}`);

  assert.match(
    migration,
    /revoke insert on table public\.posts from anon, authenticated;/i
  );
  assert.match(
    migration,
    /revoke update on table public\.posts from anon, authenticated;/i
  );
  assert.match(
    migration,
    /revoke update \([\s\S]*?moderation_checked_at[\s\S]*?\) on table public\.posts from authenticated;/i
  );
  assert.match(
    migration,
    /revoke insert on table public\.comments from anon, authenticated;/i
  );
  assert.match(
    migration,
    /revoke execute on function public\.create_comment_safe\(uuid, text\)[\s\S]*?from public, anon, authenticated;/i
  );
  assert.match(migration, /drop policy if exists "posts: verified users can create posts"/i);
  assert.match(migration, /drop policy if exists "posts: authenticated update allowed"/i);
  assert.match(migration, /drop policy if exists "comments: verified users can create"/i);
});

test("post creation and editing use the server-only content writer", () => {
  const createRoute = read("src/app/api/posts/create/route.js");
  const manageRoute = read("src/app/api/posts/manage/route.js");

  assert.match(createRoute, /requireServiceRoleClient/);
  assert.match(
    createRoute,
    /await contentWriter\.supabase[\s\S]*?\.from\("posts"\)[\s\S]*?\.insert\(payload\)/
  );

  assert.match(manageRoute, /requireServiceRoleClient/);
  assert.match(manageRoute, /async function updatePost\(\{ writeClient,/);
  assert.match(
    manageRoute,
    /await writeClient[\s\S]*?\.from\("posts"\)[\s\S]*?\.update\(allowed\)[\s\S]*?\.eq\("author_id", userId\)/
  );
});

test("comment creation cannot call the legacy authenticated RPC", () => {
  const route = read("src/app/api/comments/create/route.js");

  assert.match(route, /requireServiceRoleClient/);
  assert.match(
    route,
    /await contentWriter\.supabase[\s\S]*?\.from\("comments"\)[\s\S]*?\.insert\(\{ post_id: postId, author_id: user\.id, body \}\)/
  );
  assert.doesNotMatch(route, /\.rpc\("create_comment_safe"/);
  assert.match(route, /protectAnonymousPostAuthor/);
});

test("the elevated database key remains server-only", () => {
  const helper = read("src/lib/server/supabaseAdmin.js");

  assert.match(helper, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(helper, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});
