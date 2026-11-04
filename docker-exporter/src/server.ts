
import { createServer } from "node:http";
import {
  collectMetrics,
  getMetricsContentType
} from "./metrics/collector.js";

const PORT = Number(process.env.PORT ?? 9101);

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, {
      "Content-Type": "application/json"
    });

    response.end(JSON.stringify({ status: "healthy" }));
    return;
  }

  if (request.method === "GET" && request.url === "/metrics") {
    try {
      const metrics = await collectMetrics();

      response.writeHead(200, {
        "Content-Type": getMetricsContentType()
      });

      response.end(metrics);
    } catch (error) {
      console.error("Failed to collect Docker metrics:", error);

      response.writeHead(500, {
        "Content-Type": "application/json"
      });

      response.end(
        JSON.stringify({
          error: "Failed to collect Docker metrics"
        })
      );
    }

    return;
  }

  response.writeHead(404, {
    "Content-Type": "application/json"
  });

  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Docker Exporter listening on port ${PORT}`);
});
