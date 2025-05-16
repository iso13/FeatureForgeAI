import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { withSpan } from './traceHelper';
import { Span } from '@opentelemetry/api';

const apiKey = process.env.OPENAI_API_KEY;
const provider = process.env.LLM_PROVIDER || 'mock';

if (provider === 'openai' && !apiKey) {
  console.warn('❌ OPENAI_API_KEY not found. Falling back to mock mode.');
}

const openai = apiKey ? new OpenAI({ apiKey }) : undefined;

export async function generateSummaryLLM(
  docs: string[],
  query: string,
  parentSpan?: Span
): Promise<string> {
  const fallback = "I'm sorry, I couldn’t find relevant information. Can you please rephrase your question?";
  const context = docs.map((doc, i) => `Doc ${i + 1}:\n${doc}`).join('\n\n');

  return await withSpan('generateSummaryLLM', async span => {
    if (provider === 'openai' && openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that summarizes documents. If none are relevant, ask the user to rephrase.',
            },
            {
              role: 'user',
              content: `User query: ${query}\n\nContext:\n${context}`,
            },
          ],
          temperature: 0.3,
        });

        const summary = response?.choices?.[0]?.message?.content?.trim() || '';
        const usedFallback = summary.length < 3;

        if (usedFallback) span.addEvent('🟡 Fallback triggered');

        span.setAttribute('summaryLength', summary.length);
        span.setAttribute('wasFallbackUsed', usedFallback);

        return usedFallback ? fallback : summary;
      } catch (error: any) {
        span.recordException(error);
        span.setAttribute('wasFallbackUsed', true);
        return fallback;
      }
    }

    const mockSummary = `Mock summary for "${query}" based on ${docs.length} documents.`;
    span.setAttribute('wasFallbackUsed', false);
    span.setAttribute('summaryLength', mockSummary.length);
    return mockSummary;
  }, {
    query,
    docCount: docs.length,
    provider,
  }, parentSpan);
}