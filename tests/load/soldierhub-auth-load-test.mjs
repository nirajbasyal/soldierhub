const BASE_URL = process.env.BASE_URL || "https://www.soldierhub.com";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "";
const TEST_POST_ID = process.env.TEST_POST_ID || "";
const TEST_REPORT_POST_ID = process.env.TEST_REPORT_POST_ID || "";
const USERS = Math.max(1, Number(process.env.USERS || 3));
const DURATION_SECONDS = Math.max(10, Number(process.env.DURATION_SECONDS || 60));
const THINK_TIME_MS = Math.max(1000, Number(process.env.THINK_TIME_MS || 5000));
const ENABLE_COMMENTS = process.env.ENABLE_COMMENTS !== "false";
const ENABLE_UPVOTES = process.env.ENABLE_UPVOTES !== "false";
const ENABLE_NOTIFICATIONS = process.env.ENABLE_NOTIFICATIONS !== "false";
const ENABLE_POST_CREATE = process.env.ENABLE_POST_CREATE === "true";
const ENABLE_REPORT = process.env.ENABLE_REPORT === "true";

const results = [];
const startedAt = Date.now();
const endAt = startedAt + DURATION_SECONDS * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function record({ name, status, durationMs, ok, error = "" }) {
  results.push({ name, status, durationMs, ok, error });
}

async function timedRequest(name, url, options = {}) {
  const start = performance.now();

  try {
    const response = await fetch(url, options);
    const durationMs = Math.round(performance.now() - start);
    const ok = response.status >= 200 && response.status < 400;
    let body = "";

    try {
      body = await response.text();
    } catch {
      body = "";
    }

    record({
      name,
      status: response.status,
      durationMs,
      ok,
      error: ok ? "" : body.slice(0, 250),
    });

    return { ok, status: response.status, durationMs, body };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    record({
      name,
      status: 0,
      durationMs,
      ok: false,
      error: error?.message || "Request failed",
    });
    return { ok: false, status: 0, durationMs, body: "" };
  }
}

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

function authHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function signIn() {
  requireEnv("SUPABASE_URL", SUPABASE_URL);
  requireEnv("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
  requireEnv("TEST_USER_EMAIL", TEST_USER_EMAIL);
  requireEnv("TEST_USER_PASSWORD", TEST_USER_PASSWORD);

  const result = await timedRequest(
    "auth_login",
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      }),
    }
  );

  if (!result.ok) {
    console.error("Could not sign in test user. Make sure the test user is email-confirmed and verified in your app.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    parsed = null;
  }

  if (!parsed?.access_token || !parsed?.user?.id) {
    console.error("Login response did not include an access token.");
    process.exit(1);
  }

  return {
    accessToken: parsed.access_token,
    userId: parsed.user.id,
  };
}

async function createComment(accessToken, userNumber, loopNumber) {
  if (!ENABLE_COMMENTS || !TEST_POST_ID) return;

  await timedRequest("create_comment", `${BASE_URL}/api/comments/create`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_id: TEST_POST_ID,
      body: `SoldierHub controlled load test comment. user=${userNumber} loop=${loopNumber} time=${new Date().toISOString()}`,
    }),
  });
}

async function upvoteCycle(accessToken) {
  if (!ENABLE_UPVOTES || !TEST_POST_ID) return;

  await timedRequest("upvote_add", `${BASE_URL}/api/posts/upvote`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_id: TEST_POST_ID,
      action: "add",
    }),
  });

  await sleep(250);

  await timedRequest("upvote_remove", `${BASE_URL}/api/posts/upvote`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_id: TEST_POST_ID,
      action: "remove",
    }),
  });
}

async function notificationCycle(accessToken) {
  if (!ENABLE_NOTIFICATIONS) return;

  await timedRequest("notifications_unread_count", `${BASE_URL}/api/notifications/unread-count`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await timedRequest("notifications_mark_read", `${BASE_URL}/api/notifications/mark-read`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
  });
}

async function createPost(accessToken, userNumber, loopNumber) {
  if (!ENABLE_POST_CREATE) return;

  await timedRequest("create_post", `${BASE_URL}/api/posts/create`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      category: "general",
      anonymous: false,
      body: `Controlled SoldierHub post creation load test. user=${userNumber} loop=${loopNumber} time=${new Date().toISOString()}`,
    }),
  });
}

async function reportOnce(accessToken) {
  if (!ENABLE_REPORT || !TEST_REPORT_POST_ID) return;

  await timedRequest("report_post", `${BASE_URL}/api/posts/report`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_id: TEST_REPORT_POST_ID,
      reason: "Controlled load-test report. Admin can clear this.",
    }),
  });
}

async function runScenario(userNumber, accessToken) {
  let loopNumber = 0;

  while (Date.now() < endAt) {
    loopNumber += 1;

    await notificationCycle(accessToken);
    await sleep(Math.random() * THINK_TIME_MS + 500);

    await createComment(accessToken, userNumber, loopNumber);
    await sleep(Math.random() * THINK_TIME_MS + 500);

    await upvoteCycle(accessToken);
    await sleep(Math.random() * THINK_TIME_MS + 500);

    if (ENABLE_POST_CREATE && loopNumber % 5 === 0) {
      await createPost(accessToken, userNumber, loopNumber);
      await sleep(Math.random() * THINK_TIME_MS + 500);
    }
  }
}

function printSummary() {
  const total = results.length;
  const failed = results.filter((result) => !result.ok).length;
  const failureRate = total ? (failed / total) * 100 : 0;
  const durations = results.map((result) => result.durationMs);
  const average = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 0;
  const byName = new Map();

  for (const result of results) {
    if (!byName.has(result.name)) byName.set(result.name, []);
    byName.get(result.name).push(result);
  }

  console.log("\nSoldierHub authenticated load test summary");
  console.log("---------------------------------------");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Virtual users: ${USERS}`);
  console.log(`Duration: ${DURATION_SECONDS}s`);
  console.log(`Total requests: ${total}`);
  console.log(`Failed requests: ${failed} (${failureRate.toFixed(2)}%)`);
  console.log(`Average: ${average}ms`);
  console.log(`p90: ${percentile(durations, 90)}ms`);
  console.log(`p95: ${percentile(durations, 95)}ms`);
  console.log(`p99: ${percentile(durations, 99)}ms`);

  console.log("\nBy request type");
  console.log("---------------");
  for (const [name, items] of byName.entries()) {
    const itemDurations = items.map((item) => item.durationMs);
    const itemFailed = items.filter((item) => !item.ok).length;
    const statuses = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    console.log(
      `${name}: count=${items.length}, failed=${itemFailed}, p95=${percentile(
        itemDurations,
        95
      )}ms, statuses=${JSON.stringify(statuses)}`
    );
  }

  const recentErrors = results.filter((result) => !result.ok).slice(-10);
  if (recentErrors.length) {
    console.log("\nRecent errors");
    console.log("-------------");
    for (const error of recentErrors) {
      console.log(`${error.name}: status=${error.status}, duration=${error.durationMs}ms, error=${error.error}`);
    }
  }

  console.log("\nTarget for authenticated early-launch test: failed < 2%, no repeated 401/403/500, and p95 < 2000ms.");
}

console.log("Starting SoldierHub authenticated load test...");
console.log(`BASE_URL=${BASE_URL}`);
console.log(`USERS=${USERS}`);
console.log(`DURATION_SECONDS=${DURATION_SECONDS}`);
console.log(`Comments: ${ENABLE_COMMENTS ? "enabled" : "disabled"}`);
console.log(`Upvotes: ${ENABLE_UPVOTES ? "enabled" : "disabled"}`);
console.log(`Notifications: ${ENABLE_NOTIFICATIONS ? "enabled" : "disabled"}`);
console.log(`Post create: ${ENABLE_POST_CREATE ? "enabled" : "disabled"}`);
console.log(`Report once: ${ENABLE_REPORT ? "enabled" : "disabled"}`);

const { accessToken } = await signIn();

await reportOnce(accessToken);
await Promise.all(Array.from({ length: USERS }, (_, index) => runScenario(index + 1, accessToken)));
printSummary();
