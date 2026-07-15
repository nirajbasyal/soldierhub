import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  createAdminClient,
  createAnonymousClient,
  createTestUser,
  deleteTestUsers,
  requireLocalSupabase,
  signInTestUser,
} from "./helpers/local-supabase.mjs";

const state = {
  users: [],
  victimPostId: null,
  anonymousPostId: null,
  removedPostId: null,
};

before(async () => {
  requireLocalSupabase();

  state.attacker = await createTestUser({
    prefix: "rls-attacker",
    fullName: "RLS Attacker",
  });
  state.victim = await createTestUser({
    prefix: "rls-victim",
    fullName: "RLS Victim",
  });
  state.pending = await createTestUser({
    prefix: "rls-pending",
    fullName: "Pending Member",
    verificationStatus: "pending",
  });
  state.users.push(state.attacker, state.victim, state.pending);

  const admin = createAdminClient();
  const { data: posts, error } = await admin
    .from("posts")
    .insert([
      {
        author_id: state.victim.id,
        author_name_cached: state.victim.profile.full_name,
        author_color_cached: "#314A66",
        category: "General Q&A",
        body: "Victim post must remain unchanged",
        anonymous: false,
        status: "active",
        moderation_status: "approved",
        moderation_checked_at: new Date().toISOString(),
      },
      {
        author_id: state.victim.id,
        author_name_cached: state.victim.profile.full_name,
        author_color_cached: "#314A66",
        category: "General Q&A",
        body: "Anonymous identity regression fixture",
        anonymous: true,
        status: "active",
        moderation_status: "approved",
        moderation_checked_at: new Date().toISOString(),
      },
      {
        author_id: state.victim.id,
        author_name_cached: state.victim.profile.full_name,
        author_color_cached: "#314A66",
        category: "General Q&A",
        body: "Removed content must not be public",
        anonymous: false,
        status: "removed",
        moderation_status: "approved",
        moderation_checked_at: new Date().toISOString(),
      },
    ])
    .select("id, body");
  assert.ifError(error);

  state.victimPostId = posts.find((post) => post.body.startsWith("Victim post"))?.id;
  state.anonymousPostId = posts.find((post) => post.body.startsWith("Anonymous"))?.id;
  state.removedPostId = posts.find((post) => post.body.startsWith("Removed"))?.id;
  assert.ok(state.victimPostId && state.anonymousPostId && state.removedPostId);
});

after(async () => {
  await deleteTestUsers(state.users);
});

test("real authenticated Data API sessions cannot bypass moderated content writes", async () => {
  const { supabase } = await signInTestUser(state.attacker);

  const directPost = await supabase.from("posts").insert({
    author_id: state.attacker.id,
    category: "General Q&A",
    body: "Direct PostgREST bypass attempt",
    anonymous: false,
  });
  assert.ok(directPost.error, "authenticated INSERT on posts unexpectedly succeeded");
  assert.equal(directPost.error.code, "42501");

  const directComment = await supabase.from("comments").insert({
    post_id: state.victimPostId,
    author_id: state.attacker.id,
    body: "Direct comment bypass attempt",
  });
  assert.ok(directComment.error, "authenticated INSERT on comments unexpectedly succeeded");
  assert.equal(directComment.error.code, "42501");

  const directUpdate = await supabase
    .from("posts")
    .update({ body: "Hacked through Data API" })
    .eq("id", state.victimPostId);
  assert.ok(directUpdate.error, "authenticated UPDATE on posts unexpectedly succeeded");
  assert.equal(directUpdate.error.code, "42501");

  const legacyRpc = await supabase.rpc("create_comment_safe", {
    p_post_id: state.victimPostId,
    p_body: "Legacy RPC bypass attempt",
  });
  assert.ok(legacyRpc.error, "authenticated execution of create_comment_safe unexpectedly succeeded");
  assert.equal(legacyRpc.error.code, "42501");

  const admin = createAdminClient();
  const { data: unchanged, error: readError } = await admin
    .from("posts")
    .select("body")
    .eq("id", state.victimPostId)
    .single();
  assert.ifError(readError);
  assert.equal(unchanged.body, "Victim post must remain unchanged");

  const { count, error: countError } = await admin
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", state.victimPostId);
  assert.ifError(countError);
  assert.equal(count, 0);
});

test("RLS and database triggers block cross-account access and privilege escalation", async () => {
  const { supabase } = await signInTestUser(state.attacker);

  const victimRead = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", state.victim.id)
    .maybeSingle();
  assert.ifError(victimRead.error);
  assert.equal(victimRead.data, null, "attacker could read another member's private profile row");

  const victimUpdate = await supabase
    .from("profiles")
    .update({ bio: "cross-account overwrite" })
    .eq("id", state.victim.id)
    .select("id");
  assert.ifError(victimUpdate.error);
  assert.deepEqual(victimUpdate.data, [], "attacker updated another member's profile");

  const escalation = await supabase
    .from("profiles")
    .update({ role: "admin", verification_status: "verified" })
    .eq("id", state.attacker.id);
  assert.ok(escalation.error, "profile owner promoted their own role to admin");

  const spoofedFollow = await supabase.from("profile_follows").insert({
    follower_id: state.victim.id,
    following_id: state.attacker.id,
  });
  assert.ok(spoofedFollow.error, "attacker created a follow row on behalf of another user");

  const validFollow = await supabase.from("profile_follows").insert({
    follower_id: state.attacker.id,
    following_id: state.victim.id,
  });
  assert.ifError(validFollow.error);

  const validUnfollow = await supabase
    .from("profile_follows")
    .delete()
    .eq("follower_id", state.attacker.id)
    .eq("following_id", state.victim.id);
  assert.ifError(validUnfollow.error);

  const admin = createAdminClient();
  const { data: attackerProfile, error } = await admin
    .from("profiles")
    .select("role, verification_status")
    .eq("id", state.attacker.id)
    .single();
  assert.ifError(error);
  assert.deepEqual(attackerProfile, { role: "user", verification_status: "verified" });
});

test("pending users remain blocked and public RPCs do not expose hidden identities", async () => {
  const { supabase: pendingClient } = await signInTestUser(state.pending);

  const pendingFollow = await pendingClient.from("profile_follows").insert({
    follower_id: state.pending.id,
    following_id: state.victim.id,
  });
  assert.ok(pendingFollow.error, "pending user unexpectedly used a verified-only feature");

  const anon = createAnonymousClient();
  const publicAnonymous = await anon.rpc("get_public_post", {
    p_id: state.anonymousPostId,
  });
  assert.ifError(publicAnonymous.error);
  assert.equal(publicAnonymous.data.length, 1);
  assert.equal(publicAnonymous.data[0].anonymous, true);
  assert.equal(publicAnonymous.data[0].author_id, null);
  assert.equal(publicAnonymous.data[0].author_name, null);
  assert.equal(publicAnonymous.data[0].author_color, null);

  const removed = await anon.rpc("get_public_post", { p_id: state.removedPostId });
  assert.ifError(removed.error);
  assert.deepEqual(removed.data, [], "removed post was visible through the public RPC");
});
