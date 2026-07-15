import assert from "node:assert/strict";

import { expect, test } from "@playwright/test";

import {
  createAdminClient,
  createTestUser,
  deleteTestUsers,
  requireLocalSupabase,
} from "../integration/helpers/local-supabase.mjs";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlRj4AAAAASUVORK5CYII=",
  "base64",
);

let member;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  requireLocalSupabase();
  member = await createTestUser({
    prefix: "browser-member",
    fullName: "Browser Verified Member",
  });
});

test.afterAll(async () => {
  await deleteTestUsers([member]);
});

test("verified member signs in, publishes, replies, and uploads through the browser", async ({
  page,
}) => {
  const pageErrors = [];
  let r2PutCount = 0;

  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route(
    "https://soldierhub-integration.integration-account.r2.cloudflarestorage.com/**",
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "PUT, OPTIONS",
            "Access-Control-Allow-Headers": "content-type, x-amz-content-sha256, x-amz-date",
          },
        });
        return;
      }

      assert.equal(route.request().method(), "PUT");
      r2PutCount += 1;
      await route.fulfill({
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "",
      });
    },
  );

  await page.route("https://media.soldierhub.test/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: transparentPng,
    });
  });

  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();

  await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await dialog.locator('input[name="email"]').fill(member.email);
  await dialog.locator('input[name="current-password"]').fill(member.password);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("What do you want to ask or share?", { exact: true })).toBeVisible();

  const postMarker = `Browser publishing ${Date.now()}`;
  await page.getByText("What do you want to ask or share?", { exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Write your Soldier Hub post" });
  await editor.fill(postMarker);
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  const postArticle = page.getByRole("article").filter({ hasText: postMarker });
  await expect(postArticle).toBeVisible();

  const replyMarker = `Browser reply ${Date.now()}`;
  await postArticle.getByRole("button", { name: /Replies/ }).click();
  await postArticle.getByPlaceholder("Write a reply...").fill(replyMarker);
  await postArticle.getByRole("button", { name: "Send reply" }).click();
  await expect(postArticle.getByText(replyMarker, { exact: true })).toBeVisible();

  const imagePostMarker = `Browser image upload ${Date.now()}`;
  await page.getByText("What do you want to ask or share?", { exact: true }).click();
  const imageEditor = page.getByRole("textbox", { name: "Write your Soldier Hub post" });
  await imageEditor.fill(imagePostMarker);
  await page
    .locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]')
    .first()
    .setInputFiles({
      name: "integration-photo.png",
      mimeType: "image/png",
      buffer: transparentPng,
    });
  await expect(page.getByRole("button", { name: "Remove selected photo" })).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  const imageArticle = page.getByRole("article").filter({ hasText: imagePostMarker });
  await expect(imageArticle).toBeVisible();
  await expect(imageArticle.locator("img")).toBeVisible();
  expect(r2PutCount).toBeGreaterThanOrEqual(1);

  const admin = createAdminClient();
  const { data: posts, error } = await admin
    .from("posts")
    .select("id, body, image_url, image_key, image_thumbnail_key")
    .eq("author_id", member.id)
    .order("created_at", { ascending: false });
  assert.ifError(error);

  const textPost = posts.find((post) => post.body.includes(postMarker));
  const imagePost = posts.find((post) => post.body.includes(imagePostMarker));
  assert.ok(textPost, "browser-created text post was not persisted");
  assert.ok(imagePost, "browser-created image post was not persisted");
  assert.match(imagePost.image_key, new RegExp(`^posts/\\d{4}/\\d{2}/${member.id}/`));
  assert.equal(imagePost.image_url, `https://media.soldierhub.test/${imagePost.image_key}`);

  const { data: comments, error: commentError } = await admin
    .from("comments")
    .select("body, post_id, author_id")
    .eq("post_id", textPost.id)
    .eq("author_id", member.id);
  assert.ifError(commentError);
  assert.ok(comments.some((comment) => comment.body === replyMarker));

  expect(pageErrors).toEqual([]);
});
