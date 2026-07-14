import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeRichTextHtml } from "../src/lib/sanitizeRichTextHtml.mjs";

const assertNoExecutableMarkup = (html) => {
  assert.doesNotMatch(html, /<\/?(?:script|iframe|object|embed|svg|math|img|video|audio|style|link|meta)\b/i);
  assert.doesNotMatch(html, /\bon[a-z]+\s*=/i);
  assert.doesNotMatch(html, /(?:javascript|data|vbscript)\s*:/i);
  assert.doesNotMatch(html, /\bstyle\s*=/i);
};

test("rich text sanitizer removes stored XSS payloads during SSR", () => {
  const payloads = [
    '<p>Safe</p><script>alert("xss")</script>',
    '<p><img src=x onerror="alert(1)">Photo</p>',
    '<svg><a xlink:href="javascript:alert(1)"><circle /></a></svg>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>">',
  ];

  for (const payload of payloads) {
    assertNoExecutableMarkup(sanitizeRichTextHtml(payload));
  }
});

test("rich text sanitizer strips unsafe attributes and URL schemes", () => {
  const sanitized = sanitizeRichTextHtml(
    '<p class="evil" style="background:url(javascript:alert(1))" onclick="alert(1)">Hello</p>' +
      '<a href="&#106;avascript:alert(1)" target="_self" rel="opener">bad link</a>'
  );

  assertNoExecutableMarkup(sanitized);
  assert.equal(sanitized, "<p>Hello</p>bad link");
});

test("rich text sanitizer preserves the supported formatting allowlist", () => {
  const sanitized = sanitizeRichTextHtml(
    '<p>Hello <b>team</b> — <a href="https://example.com/orders?id=7">orders</a></p>' +
      '<blockquote><i>Stay ready</i></blockquote><ul><li>One</li></ul>'
  );

  assert.equal(
    sanitized,
    '<p>Hello <strong>team</strong> — <a href="https://example.com/orders?id=7" target="_blank" rel="noopener noreferrer nofollow">orders</a></p><blockquote><em>Stay ready</em></blockquote><ul><li>One</li></ul>'
  );
});

test("rich text sanitizer never returns raw input as a server fallback", () => {
  const payload = '<p>Visible</p><img src=x onerror="globalThis.pwned=true">';
  const sanitized = sanitizeRichTextHtml(payload);

  assert.notEqual(sanitized, payload);
  assert.equal(sanitized, "<p>Visible</p>");
});
