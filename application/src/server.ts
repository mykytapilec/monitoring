
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import client from "prom-client";

const register = new client.Registry();

register.setDefaultLabels({
  application: "monitoring-application"
});

client.collectDefaultMetrics({
  register
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed by the application.",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds.",
  labelNames: ["method", "route"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

const httpRequestsInProgress = new client.Gauge({
  name: "http_requests_in_progress",
  help: "Number of HTTP requests currently being processed.",
  registers: [register]
});

const port = Number(process.env.PORT ?? 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  data: Record<string, string>
): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });

  response.end(JSON.stringify(data));
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/metrics" && method === "GET") {
    try {
      response.writeHead(200, {
        "Content-Type": register.contentType
      });

      response.end(await register.metrics());
    } catch (error) {
      console.error("Failed to generate Prometheus metrics:", error);

      if (!response.headersSent) {
        sendJson(response, 500, {
          error: "Failed to generate metrics."
        });
      }
    }

    return;
  }

  const startedAt = process.hrtime.bigint();

  httpRequestsInProgress.inc();

  let route = "not_found";
  let statusCode = 200;

  try {
    if (method === "GET" && url.pathname === "/") {
      route = "/";
      sendJson(response, 200, {
        name: "Monitoring Application",
        status: "running"
      });
      return;
    }

    if (method === "GET" && url.pathname === "/health") {
      route = "/health";
      sendJson(response, 200, {
        status: "healthy"
      });
      return;
    }

    if (method === "GET" && url.pathname === "/api/hello") {
      route = "/api/hello";
      sendJson(response, 200, {
        message: "Hello from the monitoring application!"
      });
      return;
    }

    statusCode = method === "GET" ? 404 : 405;

    sendJson(response, statusCode, {
      error: statusCode === 404 ? "Not found." : "Method not allowed."
    });
  } catch (error) {
    statusCode = 500;
    console.error("Request processing failed:", error);

    if (!response.headersSent) {
      sendJson(response, 500, {
        error: "Internal server error."
      });
    }
  } finally {
    const duration = Number(process.hrtime.bigint() - startedAt) / 1e9;

    httpRequestsTotal.inc({
      method,
      route,
      status_code: String(statusCode)
    });

    httpRequestDuration.observe(
      {
        method,
        route
      },
      duration
    );

    httpRequestsInProgress.dec();
  }
}

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Monitoring application listening on port ${port}.`);
});
