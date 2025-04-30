// src/support/telemetry.ts

import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

console.log('⏳ Initializing OpenTelemetry...');

// 1) Create and export the tracer
export const tracer = trace.getTracer('cucumber-playwright');

// 2) Configure the OTLP exporter
const otlpExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// 3) Initialize the SDK
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'cucumber-playwright',
  }),
  traceExporter: otlpExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new FsInstrumentation(),
  ],
});

// 4) Start the SDK (no .then())
sdk.start();
console.log('✅ OpenTelemetry initialized');

// 5) Optional graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down OTEL SDK…');
  await sdk.shutdown();
  console.log('🛑 OpenTelemetry shut down');
  process.exit(0);
});