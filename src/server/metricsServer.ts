import express from 'express';
import { register } from '../support/metrics';

const port = 9464;
const METRICS_FLAG = '__cucumber_metrics_server_started__';

// Prevent double server startup using a well-known string flag
if (!(globalThis as any)[METRICS_FLAG]) {
  const app = express();

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.listen(port, () => {
    console.log(`Prometheus metrics available at http://localhost:${port}/metrics`);
  });

  (globalThis as any)[METRICS_FLAG] = true;
}