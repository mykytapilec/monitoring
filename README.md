# Monitoring

A local infrastructure monitoring stack built as part of the [roadmap.sh Monitoring project](https://roadmap.sh/projects/monitoring).

The project combines Prometheus, Grafana, Alertmanager, Loki, Alloy, and custom TypeScript exporters to monitor infrastructure, application metrics, Docker containers, and application logs.

Docker Compose provides a reproducible local environment for collecting, storing, visualizing, and alerting on monitoring data.

## Project Goals

- Collect infrastructure metrics using Prometheus and Node Exporter.
- Collect application-specific metrics from a Node.js application.
- Collect Docker container state and health metrics using a custom exporter.
- Collect and store application logs using Grafana Alloy and Loki.
- Visualize metrics and logs with provisioned Grafana dashboards.
- Provision Grafana data sources, dashboards, contact points, and notification policies automatically.
- Define Prometheus alerting and recording rules.
- Route Prometheus alerts through severity-based Alertmanager routes.
- Configure Grafana Alerting with an SMTP contact point.
- Capture notification emails locally using Mailpit.
- Discover Docker containers automatically through Prometheus Docker Service Discovery.
- Validate Prometheus, Alertmanager, and Docker Compose configuration.
- Provide a reproducible local monitoring environment with Docker Compose.

## Technology Stack

- Docker Compose
- Prometheus
- Node Exporter
- Grafana
- Grafana Alloy
- Loki
- Alertmanager
- Mailpit
- Docker Socket Proxy
- Node.js
- TypeScript
- prom-client
- promtool
- amtool

## Architecture

The monitoring stack contains several independent data collection and notification paths.

### Metrics Collection

- Node Exporter exposes system metrics.
- The sample application exposes application and process metrics.
- The custom Docker Exporter exposes container state and health metrics.
- Prometheus discovers scrape targets through Docker Service Discovery and collects their metrics.

### Logging

- The sample application writes structured JSON logs to standard output.
- Grafana Alloy discovers and collects application container logs through the Docker API.
- Alloy forwards logs to Loki.
- Grafana queries Loki through its provisioned data source.

### Alerting

Prometheus and Grafana Alerting use separate notification pipelines:

**Prometheus Alerting**

Prometheus evaluates alerting rules and sends firing and resolved alerts to Alertmanager. Alertmanager groups and routes notifications according to severity and delivers emails to Mailpit.

**Grafana Alerting**

Grafana Alerting uses a provisioned Mailpit contact point and notification policy. Grafana sends notification emails directly to Mailpit through its SMTP endpoint.

## Services

| Service | URL | Purpose |
| --- | --- | --- |
| Prometheus | [http://localhost:9090](http://localhost:9090) | Metrics collection, querying, and alert rule evaluation |
| Grafana | [http://localhost:3000](http://localhost:3000) | Metrics and log visualization, dashboards, and Grafana Alerting |
| Application | [http://localhost:3001](http://localhost:3001) | Sample Node.js application and Prometheus metrics |
| Node Exporter | [http://localhost:9100/metrics](http://localhost:9100/metrics) | System metrics endpoint |
| Alertmanager | [http://localhost:9093](http://localhost:9093) | Prometheus alert grouping and routing |
| Loki | [http://localhost:3100](http://localhost:3100) | Log storage and querying |
| Alloy | [http://localhost:12345](http://localhost:12345) | Log collection and forwarding |
| Mailpit | [http://localhost:8025](http://localhost:8025) | Local email inbox for alert notifications |

The Docker Exporter exposes its metrics endpoint on port `9101` inside the Docker Compose network. Its port is not published to the host.

The Docker Socket Proxy is also internal to the Docker Compose network.

Mailpit's SMTP endpoint is available internally at `mailpit:1025`.

Loki and Alloy HTTP interfaces are bound to `127.0.0.1` on the host.

## Prerequisites

- Docker Desktop
- Docker Compose v2

## Getting Started

Create a local environment file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set a unique, strong Grafana administrator password before starting the stack.

The `.env` file is excluded from version control and must not be committed.

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

To inspect a specific service:

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

## Grafana Provisioning

Grafana automatically provisions its data sources, dashboards, contact points, and notification policies from files in `grafana/provisioning`.

### Data Sources

The following data sources are provisioned:

| Data Source | Type | Internal URL |
| --- | --- | --- |
| Prometheus | Prometheus | `http://prometheus:9090` |
| Loki | Loki | `http://loki:3100` |

### Provisioned Dashboards

The `Monitoring` folder contains four dashboards.

**Monitoring Dashboard**

The host monitoring dashboard includes:

- CPU Usage
- Monitoring Targets
- Memory Usage
- Linux Filesystem Usage
- Network Traffic

Node Exporter uses host filesystem paths for its Linux filesystem collector.

In Docker Desktop on macOS, filesystem metrics represent filesystems visible inside the Docker Linux VM, not the actual macOS host filesystem.

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

**Application Logs**

The application logs dashboard uses Loki to display application logs collected by Grafana Alloy.

## Application Monitoring

The sample application is implemented in TypeScript and runs on Node.js.

It exposes the following endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/` | Application endpoint |
| `/health` | Application health check |
| `/metrics` | Prometheus metrics endpoint |

The application uses `prom-client` to expose application and process metrics.

Application metrics include:

- HTTP request counter
- HTTP request duration histogram
- Requests in progress gauge
- Process metrics
- Node.js event loop lag

The application is built during Docker image creation and runs in production mode.

## Docker Monitoring

The project includes a custom Docker Exporter implemented in TypeScript and Node.js.

The exporter retrieves container information through the Docker Socket Proxy using the Docker Engine API.

It does not mount the Docker socket directly.

The Docker Socket Proxy provides restricted access to the Docker API. The configuration enables the required read-only API sections:

- `CONTAINERS`
- `NETWORKS`
- `PING`
- `VERSION`

POST requests are disabled.

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

The exporter reports containers visible to the Docker daemon, not only containers belonging to this Compose project.

## Logging

The project uses Grafana Alloy and Loki for application log collection and storage.

### Log Collection

Grafana Alloy discovers Docker containers through the Docker API and filters the application container.

It collects logs from `monitoring-application` and attaches the following labels:

- `service`
- `environment`
- `container`

Alloy forwards collected logs to Loki through its internal HTTP endpoint.

### Log Storage

Loki stores logs using filesystem-based storage.

The configured retention period is 168 hours (7 days).

### Docker Log Rotation

The application container uses the Docker `json-file` logging driver with the following limits:

- Maximum log file size: `10m`
- Maximum number of files: `3`

This prevents unlimited growth of application container log files.

Open [Grafana](http://localhost:3000) and use the provisioned Loki data source or the Application Logs dashboard to inspect logs.

## Alerting

The project includes two independent alert notification pipelines.

### Prometheus Alerting and Alertmanager

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

The Prometheus notification pipeline is:

```text
Prometheus -> Alertmanager -> Mailpit
```

### Grafana Alerting

Grafana Alerting is configured through provisioning files:

- `grafana/provisioning/alerting/contact-points.yml`
- `grafana/provisioning/alerting/notification-policies.yml`

The provisioned `Mailpit` contact point uses email delivery to `admin@monitoring.local`.

Grafana SMTP settings are configured through Docker Compose environment variables:

- `GF_SMTP_ENABLED`
- `GF_SMTP_HOST`
- `GF_SMTP_FROM_ADDRESS`
- `GF_SMTP_FROM_NAME`
- `GF_SMTP_STARTTLS_POLICY`

Grafana uses the internal Mailpit SMTP endpoint at `mailpit:1025`.

The Grafana notification pipeline is:

```text
Grafana Alerting -> Mailpit Contact Point -> Mailpit
```

### Email Notifications

Open [Mailpit](http://localhost:8025) to inspect captured alert emails.

Notifications are sent to `admin@monitoring.local` from `alerts@monitoring.local`.

Mailpit captures emails locally. This setup does not deliver messages to a real external email inbox.

## Docker Healthchecks

Docker Compose healthchecks are configured for the following services:

- Prometheus
- Grafana
- Loki
- Alertmanager
- Application
- Docker Exporter

Check service health and status with:

```bash
docker compose ps
```

The health status is also available through the custom Docker Exporter and its Grafana dashboard.

## Validation with promtool

The project includes a `promtool` service based on the same Prometheus image used by the monitoring stack.

The service uses the `validation` profile, so it is not started during a normal `docker compose up -d`.

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

### Check Loki Readiness

```bash
curl -sS http://localhost:3100/ready
```

### Check Application Health

```bash
curl -sS http://localhost:3001/health
```

### Check Application Metrics

```bash
curl -sS http://localhost:3001/metrics
```

### Verify Email Notifications

Open [Mailpit](http://localhost:8025) and inspect the inbox for alert notification emails.

Both Prometheus Alertmanager and Grafana Alerting can send notifications to Mailpit.

## Stopping the Stack

Stop the containers:

```bash
docker compose down
```

Persistent metrics, logs, and Grafana data are stored in Docker-managed volumes. Running `docker compose down` preserves these volumes.

To remove the stack's persistent data as well, remove the associated Docker volumes explicitly:

```bash
docker compose down -v
```

This permanently deletes the data stored in the associated volumes.

## Project Status

The local monitoring stack is configured and verified.

The project includes infrastructure and application metrics collection, Docker container monitoring, application log collection and storage, provisioned Grafana dashboards and data sources, Prometheus alert evaluation, severity-based Alertmanager routing, Grafana Alerting provisioning, local email notification capture, Docker healthchecks, and configuration validation.
