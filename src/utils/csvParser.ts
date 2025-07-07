/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

//src/utils/csvParser.ts
import { trace, SpanStatusCode, context, ROOT_CONTEXT } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const tracer = trace.getTracer('cucumber-playwright');

export function parseCSV(filePath: string): any[] {
  const csvData = fs.readFileSync(filePath, 'utf-8');
  return parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  });
}

export async function withSpan<T>(
  name: string,
  world: { testSpan?: Span }, // or use CustomWorld if available
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, any> = {}
): Promise<T> {
  const parentSpan = world.testSpan;
  const ctx = parentSpan
    ? trace.setSpan(context.active(), parentSpan)
    : context.active() ?? ROOT_CONTEXT;

  return await context.with(ctx, async () => {
    const span = tracer.startSpan(name, { attributes }, parentSpan ? ctx : undefined);

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