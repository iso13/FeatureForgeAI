import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// ← CHANGE THIS:
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
// you don’t need to manually wire a BatchSpanProcessor when you pass traceExporter to NodeSDK

console.log('⏳ Initializing OpenTelemetry...');

// Create and export the tracer
export const tracer = trace.getTracer('cucumber-playwright');

// Create the OTLP exporter
const otlpExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// Initialize the SDK
const sdk = new NodeSDK({
  // ← use the factory instead of new Resource()
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'cucumber-playwright',
  }),
  traceExporter: otlpExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new FsInstrumentation(),
  ],
});

sdk.start();
console.log('✅ OpenTelemetry initialized');

// Create a test span
const span = tracer.startSpan('telemetry-initialization');
span.setAttribute('status', 'successful');
span.end();

// Optional manual shutdown helper
export async function shutdownTelemetry() {
  console.log('Manual shutdown of OpenTelemetry requested');
  try {
    await Promise.race([
      sdk.shutdown(),
      new Promise<void>(res =>
        setTimeout(() => {
          console.warn('⚠️ OpenTelemetry shutdown timed out after 3s');
          res();
        }, 3000)
      ),
    ]);
    console.log('✅ OpenTelemetry shutdown completed');
  } catch (err) {
    console.warn('⚠️ OpenTelemetry shutdown error:', err);
  }
}

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down…');
  shutdownTelemetry().finally(() => process.exit(0));
});