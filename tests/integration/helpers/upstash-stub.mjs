import { createServer } from "node:http";

const port = Number(process.env.TEST_RATE_LIMIT_PORT || 8079);
const counters = new Map();

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, { ok: true });
    return;
  }

  if (request.method !== "POST" || request.url !== "/pipeline") {
    json(response, 404, { error: "Not found" });
    return;
  }

  let rawBody = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    rawBody += chunk;
  });
  request.on("end", () => {
    try {
      const commands = JSON.parse(rawBody);
      const results = commands.map(([operation, key]) => {
        const command = String(operation || "").toUpperCase();
        if (command === "INCR") {
          const count = (counters.get(key) || 0) + 1;
          counters.set(key, count);
          return { result: count };
        }
        if (command === "PEXPIRE") return { result: 1 };
        return { error: `Unsupported test command: ${command}` };
      });
      json(response, 200, results);
    } catch (error) {
      json(response, 400, { error: error.message });
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Test rate limiter listening on ${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
