const BASE_URL = process.env.BASE_URL || "https://www.soldierhub.com";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const TEST_POST_ID = process.env.TEST_POST_ID || "";
const USERS = Math.max(1, Number(process.env.USERS || 25));
const DURATION_SECONDS = Math.max(10, Number(process.env.DURATION_SECONDS || 120));
const THINK_TIME_MS = Math.max(250, Number(process.env.THINK_TIME_MS || 1500));
const MAX_FAILURE_RATE_PERCENT = Math.max(
  0,
  Number(process.env.MAX_FAILURE_RATE_PERCENT || 1)
);
const MAX_P95_MS = Math.max(1, Number(process.env.MAX_P95_MS || 1500));

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

    await response.text();
    record({ name, status: response.status, durationMs, ok });

    return { ok, status: response.status, durationMs };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    record({
      name,
      status: 0,
      durationMs,
      ok: false,
      error: error?.message || "Request failed",
    });
    return { ok: false, status: 0, durationMs };
  }
}

function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function runScenario(userNumber) {
  while (Date.now() < endAt) {
    await timedRequest("homepage", BASE_URL);
    await sleep(Math.random() * THINK_TIME_MS + 250);

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      await timedRequest(
        "feed_rpc",
        `${SUPABASE_URL}/rest/v1/rpc/get_public_posts`,
        {
          method: "POST",
          headers: supabaseHeaders(),
          body: JSON.stringify({ limit_count: 30 }),
        }
      );
    }

    await sleep(Math.random() * THINK_TIME_MS + 250);

    if (SUPABASE_URL && SUPABASE_ANON_KEY && TEST_POST_ID) {
      await timedRequest(
        "comments_rpc",
        `${SUPABASE_URL}/rest/v1/rpc/get_public_comments_for_post`,
        {
          method: "POST",
          headers: supabaseHeaders(),
          body: JSON.stringify({ target_post_id: TEST_POST_ID, limit_count: 50 }),
        }
      );
    }

    await sleep(Math.random() * THINK_TIME_MS + 500 + userNumber);
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

  console.log("\nSoldierHub load test summary");
  console.log("----------------------------");
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
      console.log(
        `${error.name}: status=${error.status}, duration=${error.durationMs}ms, error=${error.error}`
      );
    }
  }

  const p95 = percentile(durations, 95);
  const passedFailureRate = failureRate < MAX_FAILURE_RATE_PERCENT;
  const passedLatency = p95 < MAX_P95_MS;

  console.log("\nLaunch gate");
  console.log("-----------");
  console.log(
    `Failure rate: ${passedFailureRate ? "PASS" : "FAIL"} (${failureRate.toFixed(2)}% < ${MAX_FAILURE_RATE_PERCENT}%)`
  );
  console.log(
    `Overall p95: ${passedLatency ? "PASS" : "FAIL"} (${p95}ms < ${MAX_P95_MS}ms)`
  );

  if (!total || !passedFailureRate || !passedLatency) {
    process.exitCode = 1;
  }
}

console.log("Starting SoldierHub load test...");
console.log(`BASE_URL=${BASE_URL}`);
console.log(`USERS=${USERS}`);
console.log(`DURATION_SECONDS=${DURATION_SECONDS}`);
console.log(
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? "Supabase RPC tests: enabled"
    : "Supabase RPC tests: disabled"
);
console.log(TEST_POST_ID ? "Comments RPC test: enabled" : "Comments RPC test: disabled");

await Promise.all(Array.from({ length: USERS }, (_, index) => runScenario(index + 1)));
printSummary();
