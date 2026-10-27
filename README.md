# Monitoring

A local infrastructure monitoring stack built as part of the [roadmap.sh Monitoring project](https://roadmap.sh/projects/monitoring).

The stack uses Prometheus to collect metrics, Node Exporter to expose system metrics, Grafana to visualize monitoring data, Alertmanager to route alerts, and Mailpit to capture alert notification emails locally.

## Project Goals

- Collect infrastructure metrics using Prometheus and Node Exporter.
- Visualize metrics with a provisioned Grafana dashboard.
- Provision the Prometheus data source and dashboards automatically.
- Define alerting rules for unavailable monitoring targets and high CPU usage.
- Route alerts through Alertmanager and verify email notifications using Mailpit.
- Validate Prometheus configuration and alerting rules with `promtool`.
- Provide a reproducible local monitoring environment with Docker Compose.

## Technology Stack

- Docker Compose
- Prometheus
- Node Exporter
- Grafana
- Alertmanager
- Mailpit
- promtool

## Services

| Service | URL | Purpose |
| --- | --- | --- |
| Prometheus | http://localhost:9090 | Metrics collection, querying, and alert rule evaluation |
| Grafana | http://localhost:3000 | Metrics visualization and dashboards |
| Node Exporter | http://localhost:9100/metrics | System metrics endpoint |
| Alertmanager | http://localhost:9093 | Alert grouping, routing, and notification delivery |
| Mailpit | http://localhost:8025 | Local email inbox for alert notifications |

Mailpit's SMTP endpoint is available internally to the Docker Compose network at `mailpit:1025`.

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

To inspect a specific service, for example Prometheus:

```bash
docker compose logs -f prometheus
```

## Grafana Access

Open [Grafana](http://localhost:3000) in your browser.

The local development credentials configured in Docker Compose are:

- Username: `admin`
- Password: `admin`

These credentials are intended for local development only. Change them before exposing Grafana to a network or deploying it publicly.

The Prometheus data source and the Monitoring Dashboard are provisioned automatically from configuration files in the `grafana/provisioning` and `grafana/dashboards` directories.

The dashboard includes the following panels:

- CPU Usage
- Monitoring Targets
- Memory Usage
- Container Filesystem Usage
- Network Traffic

## Alerting

Prometheus loads alerting rules from `prometheus/rules/alert-rules.yml`.

The current rules are:

| Alert | Condition | Severity |
| --- | --- | --- |
| `PrometheusTargetDown` | A monitored target is unavailable for more than 1 minute | `critical` |
| `HighCPUUsage` | CPU usage exceeds 80% for more than 5 minutes | `warning` |

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

The local monitoring stack is configured and verified. Prometheus metrics collection, Grafana dashboard provisioning, alert rule evaluation, Alertmanager health, local email notification capture, and `promtool` validation have been checked.
