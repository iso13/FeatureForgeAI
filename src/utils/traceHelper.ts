import { trace, Span, SpanStatusCode, context, trace as otelTrace } from '@opentelemetry/api';

const tracer = trace.getTracer('rag');

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, any> = {},
  parentSpan?: Span
): Promise<T> {
  const parentCtx = parentSpan
    ? otelTrace.setSpan(context.active(), parentSpan)
    : context.active();

  return await context.with(parentCtx, async () => {
    const span = tracer.startSpan(name, { attributes });

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}