# Monitoring

A local infrastructure monitoring stack built as part of the [roadmap.sh Monitoring project](https://roadmap.sh/projects/monitoring).

The stack uses Prometheus to collect metrics, Node Exporter to expose system metrics, Grafana to visualize monitoring data, Alertmanager to route alerts, and Mailpit to capture alert notification emails locally.

A sample Node.js application is also included to demonstrate application-level monitoring with Prometheus metrics.

A custom Docker Exporter collects container state and health information through a restricted Docker Socket Proxy and exposes these metrics to Prometheus.

## Project Goals

- Collect infrastructure metrics using Prometheus and Node Exporter.
- Collect application-specific metrics from a Node.js application.
- Collect Docker container state and health metrics using a custom exporter.
- Visualize metrics with provisioned Grafana dashboards.
- Provision the Prometheus data source and dashboards automatically.
- Define alerting rules for unavailable monitoring targets, high CPU usage, and high memory usage.
- Route critical and warning alerts through severity-based Alertmanager routes.
- Route alerts through Alertmanager and verify email notifications using Mailpit.
- Validate Prometheus configuration and alerting rules with `promtool`.
- Provide a reproducible local monitoring environment with Docker Compose.
- Protect Grafana access with administrator authentication.

## Technology Stack

- Docker Compose
- Prometheus
- Node Exporter
- Grafana
- Alertmanager
- Mailpit
- Docker Socket Proxy
- Node.js
- TypeScript
- prom-client
- promtool

## Services

| Service | URL | Purpose |
| --- | --- | --- |
| Prometheus | [http://localhost:9090](http://localhost:9090) | Metrics collection, querying, and alert rule evaluation |
| Grafana | [http://localhost:3000](http://localhost:3000) | Metrics visualization and dashboards |
| Application | [http://localhost:3001](http://localhost:3001) | Sample Node.js application with Prometheus instrumentation |
| Node Exporter | [http://localhost:9100/metrics](http://localhost:9100/metrics) | System metrics endpoint |
| Alertmanager | [http://localhost:9093](http://localhost:9093) | Alert grouping, routing, and notification delivery |
| Mailpit | [http://localhost:8025](http://localhost:8025) | Local email inbox for alert notifications |

The Docker Exporter exposes its metrics endpoint on port `9101` inside the Docker Compose network. Its port is not published to the host.

Prometheus discovers the Docker Exporter automatically through Docker Service Discovery.

Mailpit's SMTP endpoint is available internally to the Docker Compose network at `mailpit:1025`.

## Prerequisites

- Docker Desktop
- Docker Compose v2

## Getting Started

Create a local environment file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set a unique, strong Grafana administrator password before starting the stack. The `.env` file is excluded from version control and must not be committed.

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

To inspect a specific service, for example Prometheus:

```bash
docker compose logs -f prometheus
```

## Grafana Access

Open [Grafana](http://localhost:3000) in your browser.

Use the administrator username and password configured in `.env`.

Grafana administrator credentials are provided through the following environment variables:

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`

User self-registration is disabled.

For an existing Grafana data volume, changing `GRAFANA_ADMIN_PASSWORD` in `.env` does not automatically update the password of an existing administrator. The password must be updated separately.

### Reset the Grafana Administrator Password

To reset the administrator password to the value configured in `.env`, run:

```bash
set -a
source .env
set +a

printf '%s' "$GRAFANA_ADMIN_PASSWORD" | \
  docker compose exec -T grafana \
  grafana cli admin reset-admin-password --password-from-stdin

unset GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD
```

This command updates the existing administrator password without removing Grafana data or Docker volumes.

Do not remove the `grafana_data` volume when resetting the administrator password.

### Provisioned Dashboards

The Prometheus data source and dashboards are provisioned automatically from configuration files in the `grafana/provisioning` and `grafana/dashboards` directories.

The `Monitoring` folder contains three dashboards.

**Monitoring Dashboard**

The host monitoring dashboard includes:

- CPU Usage
- Monitoring Targets
- Memory Usage
- Container Filesystem Usage
- Network Traffic

The filesystem panel displays metrics reported by Node Exporter for the filesystems visible to its runtime.

In Docker Desktop on macOS, these metrics may not represent the actual disk usage of the host system.

**Application Monitoring**

The application monitoring dashboard includes:

- HTTP Requests per Second
- HTTP Request Duration p95
- Total HTTP Requests
- Requests in Progress
- Process Memory Usage
- Process CPU Usage
- Node.js Event Loop Lag

**Docker Container Monitoring**

The Docker container monitoring dashboard uses metrics collected by the custom Docker Exporter.

It includes:

- Total Containers
- Running Containers
- Stopped Containers
- Container Health Status
- Container States
- Container Overview

The overview table displays container names, images, states, and running status.

Container health metrics use the following statuses:

- `healthy`
- `unhealthy`
- `starting`
- `none` — the container does not define a Docker healthcheck.

The dashboard refreshes automatically every 15 seconds.

## Docker Monitoring

The project includes a custom Docker Exporter implemented in TypeScript and Node.js.

The exporter retrieves container information through the Docker Socket Proxy using the Docker Engine API.

It does not mount the Docker socket directly.

The Docker Socket Proxy provides restricted access to the Docker API. The exporter uses this proxy to retrieve container summaries and inspect individual containers.

The exporter exposes two HTTP endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/health` | Exporter health check |
| `/metrics` | Prometheus metrics endpoint |

### Exported Metrics

| Metric | Type | Description |
| --- | --- | --- |
| `docker_container_running` | Gauge | Indicates whether a container is running |
| `docker_container_health_status` | Gauge | Exposes container health status using one-hot values |
| `docker_container_info` | Gauge | Provides container identification information |

The `docker_container_running` metric uses the following values:

- `1` — the container is running.
- `0` — the container is not running.

The `docker_container_health_status` metric uses the `status` label to identify the container health state.

The `docker_container_info` metric provides container metadata through labels.

### Docker Exporter Configuration

The exporter is built from the `docker-exporter` directory and runs as a Docker Compose service.

Its configuration is provided through environment variables:

- `PORT` — HTTP server port.
- `DOCKER_API_URL` — Docker Socket Proxy API endpoint.

The default Docker API endpoint is:

```text
http://docker-socket-proxy:2375
```

Prometheus discovers the exporter through Docker Service Discovery using the `prometheus_scrape` and `prometheus_job` container labels.

The exporter does not require a published host port.

## Alerting

Prometheus loads alerting rules from `prometheus/rules/alert-rules.yml`.

The current rules are:

| Alert | Condition | Severity |
| --- | --- | --- |
| `PrometheusTargetDown` | A monitored target is unavailable for more than 1 minute | `critical` |
| `HighCPUUsage` | CPU usage exceeds 80% for more than 5 minutes | `warning` |
| `HighMemoryUsage` | Memory usage exceeds 80% for more than 5 minutes | `warning` |

Alertmanager routes notifications according to their severity:

- **Critical alerts:** Sent through the `mailpit-critical` receiver with no initial group wait and a repeat interval of 30 minutes.
- **Warning alerts:** Sent through the `mailpit-warning` receiver with an initial group wait of 30 seconds and a repeat interval of 4 hours.
- **Default route:** Uses the `mailpit` receiver for alerts that do not match the severity-specific routes.

All receivers send notifications to the local Mailpit SMTP service. Resolved notifications are enabled for all receivers.

Prometheus sends alerts to Alertmanager, which routes notifications to Mailpit through the local SMTP endpoint.

Open [Mailpit](http://localhost:8025) to inspect captured alert emails. Notifications are sent to `admin@monitoring.local` from `alerts@monitoring.local`.

Mailpit captures emails locally. This setup does not deliver messages to a real external email inbox.

## Validation with promtool

The project includes a `promtool` service based on the same Prometheus image used by the monitoring stack. The service uses the `validation` profile, so it is not started during a normal `docker compose up -d`.

### Validate Docker Compose Configuration

```bash
docker compose config --quiet
```

### Validate Prometheus Configuration and Alerting Rules

```bash
docker compose run --rm promtool
```

This command validates `prometheus/prometheus.yml` and the alerting rule files referenced by the configuration.

### Validate Alerting Rules Separately

```bash
docker compose run --rm --entrypoint /bin/promtool promtool check rules /etc/prometheus/rules/alert-rules.yml
```

A successful validation reports `SUCCESS` and the number of rules found.

The `--rm` flag removes the temporary validation container after the command finishes. No additional long-running service is required.

## Validate Alertmanager Configuration

Validate the Alertmanager configuration using `amtool` from the same Alertmanager image used by the monitoring stack:

```bash
docker compose run --rm alertmanager-validator
```

The validator checks the Alertmanager configuration without starting a persistent service.

A successful validation reports that the configuration file is valid. The `--rm` flag removes the temporary container after the command finishes.

## Verification

### Check Prometheus Readiness

```bash
curl -sS http://localhost:9090/-/ready
```

### Check Prometheus Targets

```bash
curl -sS http://localhost:9090/api/v1/targets
```

### Query Target Availability

```bash
curl -sSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=up'
```

A value of `1` indicates that a target is reachable. A value of `0` indicates that a target is unavailable.

### Check Docker Exporter Metrics

The following command queries the Docker Exporter metrics through Prometheus:

```bash
curl -sSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=docker_container_running'
```

Check the total number of containers:

```bash
curl -sSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=count(docker_container_info)'
```

Check the number of running containers:

```bash
curl -sSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum(docker_container_running)'
```

Check the number of stopped containers:

```bash
curl -sSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=count(docker_container_running == 0)'
```

### Check Loaded Alert Rules

```bash
curl -sS http://localhost:9090/api/v1/rules
```

### Check Alertmanager Health

```bash
curl -sS http://localhost:9093/-/healthy
```

### Check Active Alerts

```bash
curl -sS http://localhost:9093/api/v2/alerts
```

An empty alert list is expected when no alerts are active.

### Verify Email Notifications

Open [Mailpit](http://localhost:8025) and inspect the inbox for alert notification emails. Both firing and resolved notifications may be present.

## Stopping the Stack

Stop the containers:

```bash
docker compose down
```

Persistent metrics and Grafana data are stored in Docker-managed volumes. Running `docker compose down` preserves these volumes.

To remove the stack's persistent data as well, remove the associated Docker volumes explicitly. This permanently deletes the data stored in those volumes.

## Project Status

The local monitoring stack is configured and verified. Prometheus metrics collection, Grafana dashboard provisioning, application monitoring, Docker container monitoring, CPU and memory alert evaluation, severity-based Alertmanager routing, local email notification capture, and configuration validation have been checked.
