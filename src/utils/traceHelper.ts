import { trace, Span, SpanStatusCode, context, ROOT_CONTEXT } from '@opentelemetry/api';

const tracer = trace.getTracer('cucumber-playwright');

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, any> = {},
  parentSpan?: Span
): Promise<T> {
  const ctx = parentSpan
    ? trace.setSpan(context.active(), parentSpan)
    : context.active() ?? ROOT_CONTEXT;

  return await context.with(ctx, async () => {
    const span = tracer.startSpan(name, {
      attributes,
    });

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}