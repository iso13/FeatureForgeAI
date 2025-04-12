// src/support/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { trace } from '@opentelemetry/api';

console.log('🐞 telemetry.ts: initializing SDK with OTLP gRPC exporter');

// 1) OTLP gRPC exporter to Jaeger’s gRPC port (4317)
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4317',
});

// 2) Build the SDK, using SimpleSpanProcessor for immediate export
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    // use the literal key instead of the deprecated constant
    'service.name': 'cucumber-playwright',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new FsInstrumentation(),
  ],
  spanProcessor: new SimpleSpanProcessor(exporter),
});

(async () => {
  try {
    await sdk.start();
    console.log('✅ telemetry.ts: SDK started');
  } catch (err) {
    console.error('❌ telemetry.ts: SDK failed to start', err);
  }
})();

// Flush on exit so no spans are lost
process.on('beforeExit', async () => {
  console.log('🐞 telemetry.ts: beforeExit—shutting down SDK');
  try {
    await sdk.shutdown();
    console.log('🛑 telemetry.ts: SDK shut down');
  } catch (err: any) {
    console.warn('⚠️ telemetry.ts: shutdown error (ignored)', err);
  }
});

export const tracer = trace.getTracer('cucumber-playwright');