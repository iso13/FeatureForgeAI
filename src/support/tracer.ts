// src/support/tracer.ts

import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions/incubating';

export const tracer = trace.getTracer('cucumber-playwright');

let sdk: NodeSDK | undefined;
const isTracingEnabled = process.env.ENABLE_TRACING === 'true';
const isVerbose = process.env.VERBOSE === 'true';

// Only log when both tracing is enabled AND verbose is true
const shouldLog = isTracingEnabled && isVerbose;

async function initTelemetry() {
  if (shouldLog) console.log('Initializing OpenTelemetry...');

  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'cucumber-playwright',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.ENV || 'local',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: otlpExporter,
    instrumentations: [new HttpInstrumentation(), new FsInstrumentation()],
  });

  await sdk.start();

  if (shouldLog) console.log('OpenTelemetry initialized (OTLP)');

  const span = tracer.startSpan('telemetry-initialization');
  span.setAttribute('otel.status', 'initialized');
  span.end();
}

export async function shutdownTelemetry() {
  if (isTracingEnabled && sdk) {
    if (shouldLog) console.log('Shutting down OpenTelemetry...');
    try {
      await Promise.race([
        sdk.shutdown(),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            if (shouldLog) console.warn('OpenTelemetry shutdown timed out after 3s');
            resolve();
          }, 3000)
        ),
      ]);
      if (shouldLog) console.log('OpenTelemetry shutdown complete');
    } catch (err) {
      if (shouldLog) console.warn('OpenTelemetry shutdown error:', err);
    }
  }
}

if (isTracingEnabled) {
  initTelemetry().catch((err) => {
    if (shouldLog) console.error('OpenTelemetry initialization failed:', err);
  });

  process.on('SIGTERM', async () => {
    if (shouldLog) console.log('Received SIGTERM – shutting down gracefully');
    await shutdownTelemetry();
    process.exit(0);
  });
}