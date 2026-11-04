
import client from "prom-client";
import { getContainers } from "../docker/client.js";

const registry = new client.Registry();

registry.setDefaultLabels({
  service: "docker-exporter"
});

const containerRunning = new client.Gauge({
  name: "docker_container_running",
  help: "Indicates whether a Docker container is running.",
  labelNames: ["container_id", "name", "image", "state"] as const,
  registers: [registry]
});

const containerHealthStatus = new client.Gauge({
  name: "docker_container_health_status",
  help: "Indicates the health status of a Docker container using one-hot values.",
  labelNames: ["container_id", "name", "status"] as const,
  registers: [registry]
});

const containerInfo = new client.Gauge({
  name: "docker_container_info",
  help: "Information about a Docker container.",
  labelNames: ["container_id", "name", "image"] as const,
  registers: [registry]
});

export async function collectMetrics(): Promise<string> {
  const containers = await getContainers();

  containerRunning.reset();
  containerHealthStatus.reset();
  containerInfo.reset();

  for (const container of containers) {
    const labels = {
      container_id: container.id,
      name: container.name,
      image: container.image
    };

    containerRunning.set(
      {
        ...labels,
        state: container.state
      },
      container.state === "running" ? 1 : 0
    );

    containerHealthStatus.set(
      {
        container_id: container.id,
        name: container.name,
        status: container.healthStatus
      },
      1
    );

    containerInfo.set(labels, 1);
  }

  return registry.metrics();
}

export function getMetricsContentType(): string {
  return registry.contentType;
}
