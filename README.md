# Monitoring

Infrastructure monitoring stack built as part of the [roadmap.sh Monitoring project](https://roadmap.sh/projects/monitoring).

## Project Goals

- Collect infrastructure metrics with Prometheus and Node Exporter.
- Visualize metrics using Grafana dashboards.
- Provision the Prometheus data source and dashboards automatically.
- Provide a reproducible local monitoring environment with Docker Compose.
- Extend the stack with alerting rules and monitoring alerts in future iterations.

## Technology Stack

- Docker Compose
- Prometheus
- Grafana
- Node Exporter

## Services

| Service | URL | Purpose |
| --- | --- | --- |
| Prometheus | http://localhost:9090 | Metrics collection and querying |
| Grafana | http://localhost:3000 | Metrics visualization |
| Node Exporter | http://localhost:9100/metrics | System metrics endpoint |

## Prerequisites

- Docker Desktop
- Docker Compose v2

## Getting Started

Start the monitoring stack:

```bash
docker compose up -d
```

Check service status:

```bash
docker compose ps
```

View service logs:

```bash
docker compose logs -f
```

## Grafana Access

Open [Grafana](http://localhost:3000) in your browser.

The local development credentials configured in Docker Compose are:

- Username: `admin`
- Password: `admin`

These credentials are for local development only. Change them before exposing Grafana to a network or deploying it publicly.

The Prometheus data source and the Monitoring Dashboard are provisioned automatically. The dashboard includes panels for monitoring target availability and CPU usage.

## Verification

Check that Prometheus is ready:

```bash
curl -s http://localhost:9090/-/ready
```

Query target availability:

```bash
curl -sG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=up'
```

A value of `1` indicates that a target is reachable.

## Stopping the Stack

Stop the containers:

```bash
docker compose down
```

Persistent metrics and Grafana data are stored in Docker-managed volumes. Running `docker compose down` preserves these volumes.

To remove the stack's persistent data as well, Docker volumes must be removed explicitly.

## Project Status

The initial monitoring stack is configured and verified locally. Alerting rules and additional dashboards can be added in subsequent iterations.
