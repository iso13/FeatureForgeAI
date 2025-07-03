export function logTelemetry(eventName: string, details: object) {
    console.log(`[OTEL] ${eventName}`, JSON.stringify(details));
  
    // OPTIONAL: Send to Prometheus, Jaeger, etc.
    // e.g., sendMetric('heart_rate_alert_triggered', 1);
  }