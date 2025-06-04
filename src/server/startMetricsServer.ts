import { register } from '../support/metrics';
import express from 'express';

const port = 9464;
const app = express();

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`Prometheus metrics available at http://localhost:${port}/metrics`);
});
