# Redis Monitoring and Alerting

This document describes the Redis monitoring and alerting setup for the database service.

## Overview

The database service now includes comprehensive monitoring for Redis connection status and operation health. When Redis goes down, the application continues to function without caching, and alerts are triggered to notify operators.

## Metrics

The following Prometheus metrics are exposed at `/metrics`:

### `database_redis_connection_status`
- **Type**: Gauge
- **Values**: `1` (connected) or `0` (disconnected)
- **Description**: Current Redis connection status

### `database_redis_operation_success_total`
- **Type**: Counter
- **Labels**: `operation` (get, set, remove)
- **Description**: Total number of successful Redis operations

### `database_redis_operation_failures_total`
- **Type**: Counter
- **Labels**: `operation` (get, set, remove)
- **Description**: Total number of failed Redis operations

## Alerts

### DatabaseRedisDown
- **Severity**: Critical
- **Condition**: Redis connection is down for more than 1 minute
- **Description**: The database service has lost connection to Redis. Cache is unavailable but the service continues to operate.
- **Action**: Check Redis pod status, network connectivity, and Redis logs.

### DatabaseRedisOperationFailures
- **Severity**: Warning
- **Condition**: Redis operations failing at rate > 0.1/second for 2 minutes
- **Description**: Redis operations are experiencing failures
- **Action**: Check Redis health, network latency, and error logs.

### DatabaseRedisHighFailureRate
- **Severity**: Critical
- **Condition**: Redis operations failing at rate > 1/second for 1 minute
- **Description**: Critical failure rate - service is degraded
- **Action**: Investigate immediately. Check Redis status, restart if necessary.

## Grafana Dashboard

A dedicated Grafana dashboard "Database Redis Monitoring" provides:

1. **Redis Connection Status** - Real-time connection state
2. **Operation Success Rate** - Rate of successful operations by type
3. **Operation Failure Rate** - Rate of failed operations by type
4. **Success Rate %** - Overall success percentage
5. **Connection History** - Timeline of connection up/down events

Import the dashboard from: `Simulator/grafana-dashboards/database-redis-monitoring.json`

## Deployment

The monitoring stack is deployed automatically with the database Helm chart:

- **ServiceMonitor**: Scrapes `/metrics` endpoint every 30 seconds
- **PrometheusRule**: Defines alert rules
- **Service**: Labeled for Prometheus discovery

## Testing Alerting

To test the alerting system:

1. Deploy to staging environment
2. Stop the Redis pod: `kubectl delete pod -l app=redis`
3. Verify metrics show `database_redis_connection_status = 0`
4. Wait 1 minute for `DatabaseRedisDown` alert to fire
5. Check Alertmanager UI for active alerts
6. Restart Redis and verify recovery

## Configuration

Alert routing and notification channels are configured in Alertmanager. Ensure the following labels are routed appropriately:

- `severity: critical` → PagerDuty / immediate notifications
- `severity: warning` → Slack / email notifications
- `component: database`
- `service: redis`

