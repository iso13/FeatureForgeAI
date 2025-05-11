import client from 'prom-client';

export const register = new client.Registry();

// Histogram to track scenario duration
export const testDuration = new client.Histogram({
  name: 'test_duration_seconds',
  help: 'Duration of each test scenario in seconds',
  labelNames: ['feature', 'scenario', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

register.registerMetric(testDuration);

// Collect default Node.js metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });