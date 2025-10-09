import { Registry, Gauge, Counter } from 'prom-client';

// Create a custom registry
export const register = new Registry();

// Redis connection status gauge (1 = connected, 0 = disconnected)
export const redisConnectionGauge = new Gauge({
  name: 'database_redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

// Redis operation failures counter
export const redisFailureCounter = new Counter({
  name: 'database_redis_operation_failures_total',
  help: 'Total number of failed Redis operations',
  labelNames: ['operation'], // 'get', 'set', 'remove'
  registers: [register],
});

// Redis operation success counter
export const redisSuccessCounter = new Counter({
  name: 'database_redis_operation_success_total',
  help: 'Total number of successful Redis operations',
  labelNames: ['operation'],
  registers: [register],
});

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'database_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Initialize Redis status as disconnected
redisConnectionGauge.set(0);

