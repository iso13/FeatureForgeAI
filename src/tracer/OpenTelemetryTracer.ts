import { NodeSDK } from '@opentelemetry/sdk-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const serviceName = process.env.OTEL_SERVICE_NAME || 'cucumber-automation';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: otlpEndpoint,
  }),
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

export async function startTracing(): Promise<void> {
  await sdk.start();
  console.log(`[Tracing] OpenTelemetry SDK started for service: ${serviceName}`);
}

export async function shutdownTracing(): Promise<void> {
  await sdk.shutdown();
  console.log('[Tracing] OpenTelemetry SDK shutdown complete.');
}