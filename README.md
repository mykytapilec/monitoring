
# Monitoring

A local infrastructure monitoring stack built as part of the [roadmap.sh Monitoring project](https://roadmap.sh/projects/monitoring).

The stack uses Prometheus to collect metrics, Node Exporter to expose system metrics, Grafana to visualize monitoring data, Alertmanager to route alerts, and Mailpit to capture alert notification emails locally.

A sample Node.js application is also included to demonstrate application-level monitoring with Prometheus metrics.

## Project Goals

- Collect infrastructure metrics using Prometheus and Node Exporter.
- Collect application-specific metrics from a Node.js application.
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

The `Monitoring` folder contains two dashboards.

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

### Validate Docker Compose configuration

```bash
docker compose config --quiet
```

### Validate Prometheus configuration and alerting rules

```bash
docker compose run --rm promtool
```

This command validates `prometheus/prometheus.yml` and the alerting rule files referenced by the configuration.

### Validate alerting rules separately

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

### Check Prometheus readiness

```bash
curl -sS http://localhost:9090/-/ready
```

### Check Prometheus targets

```bash
curl -sS http://localhost:9090/api/v1/targets
```

### Query target availability

```bash
curl -sSG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=up'
```

A value of `1` indicates that a target is reachable. A value of `0` indicates that a target is unavailable.

### Check loaded alert rules

```bash
curl -sS http://localhost:9090/api/v1/rules
```

### Check Alertmanager health

```bash
curl -sS http://localhost:9093/-/healthy
```

### Check active alerts

```bash
curl -sS http://localhost:9093/api/v2/alerts
```

An empty alert list is expected when no alerts are active.

### Verify email notifications

Open [Mailpit](http://localhost:8025) and inspect the inbox for alert notification emails. Both firing and resolved notifications may be present.

## Stopping the Stack

Stop the containers:

```bash
docker compose down
```

Persistent metrics and Grafana data are stored in Docker-managed volumes. Running `docker compose down` preserves these volumes.

To remove the stack's persistent data as well, remove the associated Docker volumes explicitly. This permanently deletes the data stored in those volumes.

## Project Status

The local monitoring stack is configured and verified. Prometheus metrics collection, Grafana dashboard provisioning, application monitoring, CPU and memory alert evaluation, severity-based Alertmanager routing, local email notification capture, and configuration validation have been checked.
