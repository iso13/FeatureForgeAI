import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

console.log('⏳ Initializing OpenTelemetry...');

// Create and export the tracer
export const tracer = trace.getTracer('cucumber-playwright');

// Create the OTLP exporter - use the correct endpoint path
const otlpExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces', // Note the "/v1/traces" path
});

// Initialize the SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'cucumber-playwright',
  }),
  traceExporter: otlpExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new FsInstrumentation(),
  ],
});

// Start the SDK
sdk.start();
console.log('✅ OpenTelemetry initialized');

// Create a test span using the tracer
const span = tracer.startSpan('telemetry-initialization');
span.setAttribute('status', 'successful');
console.log('🔍 Created test span');
span.end();

// Simplified non-blocking shutdown function
export async function shutdownTelemetry() {
  console.log('Manual shutdown of OpenTelemetry requested');
  
  try {
    // Set a timeout for the shutdown
    const shutdownPromise = sdk.shutdown();
    
    // Create a timeout promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log('⚠️ OpenTelemetry shutdown timed out');
        resolve(false);
      }, 3000);
    });
    
    // Race the promises
    const result = await Promise.race([
      shutdownPromise.then(() => true),
      timeoutPromise
    ]);
    
    if (result === true) {
      console.log('✅ OpenTelemetry shutdown completed successfully');
    }
    
    return true; // Continue regardless of shutdown success
  } catch (err) {
    console.warn('⚠️ OpenTelemetry shutdown error:', err);
    return false;
  }
}

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  shutdownTelemetry().finally(() => process.exit(0));
});

console.log('✅ Tracer utility fully initialized');