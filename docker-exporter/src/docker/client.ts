
interface DockerContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
}

interface DockerContainerInspect {
  State: {
    Status: string;
    Health?: {
      Status: string;
    };
  };
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  healthStatus: string;
}

const DOCKER_API_URL =
  process.env.DOCKER_API_URL ?? "http://docker-socket-proxy:2375";

const REQUEST_TIMEOUT = 5000;

async function dockerRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${DOCKER_API_URL}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT)
  });

  if (!response.ok) {
    throw new Error(
      `Docker API request failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as T;
}

export async function getContainers(): Promise<DockerContainer[]> {
  const containers = await dockerRequest<DockerContainerSummary[]>(
    "/containers/json?all=1"
  );

  return Promise.all(
    containers.map(async (container) => {
      const details = await dockerRequest<DockerContainerInspect>(
        `/containers/${container.Id}/json`
      );

      return {
        id: container.Id,
        name: container.Names[0]?.replace(/^\//, "") ?? container.Id,
        image: container.Image,
        state: details.State.Status || container.State,
        healthStatus: details.State.Health?.Status ?? "none"
      };
    })
  );
}
