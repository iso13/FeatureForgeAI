import { trace, context } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { tracer } from './tracer'; // Import the shared tracer

console.log('⏳ Initializing OpenTelemetry...');

// Create the OTLP exporter
const otlpExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/api/traces',
});

// Also add console exporter for debugging
const consoleExporter = new ConsoleSpanExporter();

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'cucumber-playwright',
  }),
  traceExporter: otlpExporter,
  spanProcessors: [
    new BatchSpanProcessor(otlpExporter),
    new BatchSpanProcessor(consoleExporter),
  ],
  instrumentations: [
    new HttpInstrumentation(),
    new FsInstrumentation(),
  ],
});

sdk.start();
console.log('✅ OpenTelemetry initialized');

// Create a test span using the shared tracer
const span = tracer.startSpan('telemetry-initialization');
span.setAttribute('status', 'successful');
console.log('🔍 Created test span');
span.end();

process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('🛑 OpenTelemetry shut down');
    process.exit(0);
  } catch (error: unknown) {
    console.error('❌ Error shutting down OpenTelemetry:', error);
    process.exit(1);
  }
});