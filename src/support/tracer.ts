import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('cucumber-playwright');

let sdk: any;
const isTracingEnabled = process.env.ENABLE_TRACING === 'true';

async function initTelemetry() {
  console.log('⏳ Initializing OpenTelemetry...');

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http');
  const { FsInstrumentation } = await import('@opentelemetry/instrumentation-fs');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { Resource } = await import('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

  const otlpExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'cucumber-playwright',
    'deployment.environment': process.env.ENV || 'local',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: otlpExporter,
    instrumentations: [new HttpInstrumentation(), new FsInstrumentation()],
  });

  await sdk.start();
  console.log('✅ OpenTelemetry initialized');

  const span = tracer.startSpan('telemetry-initialization');
  span.setAttribute('status', 'successful');
  span.end();
}

if (isTracingEnabled) {
  initTelemetry().catch((err) => {
    console.error('🚨 OpenTelemetry failed to initialize:', err);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down…');
    shutdownTelemetry().finally(() => process.exit(0));
  });
} else {
  console.log('🚫 OpenTelemetry is disabled (ENABLE_TRACING not set to true)');
}

export async function shutdownTelemetry() {
  if (isTracingEnabled && sdk) {
    console.log('Manual shutdown of OpenTelemetry requested');
    try {
      await Promise.race([
        sdk.shutdown(),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            console.warn('⚠️ OpenTelemetry shutdown timed out after 3s');
            resolve();
          }, 3000)
        ),
      ]);
      console.log('✅ OpenTelemetry shutdown completed');
    } catch (err) {
      console.warn('⚠️ OpenTelemetry shutdown error:', err);
    }
  }
}