/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { withSpan } from './traceHelper';
import type { Span } from '@opentelemetry/api';

const apiKey = process.env.OPENAI_API_KEY;
const provider = process.env.LLM_PROVIDER || 'mock';

if (provider === 'openai' && !apiKey) {
  console.warn('OPENAI_API_KEY not found. Falling back to mock mode.');
}

const openai = apiKey ? new OpenAI({ apiKey }) : undefined;

export async function generateSummaryLLM(
  docs: string[],
  query: string,
  parentSpan?: Span
): Promise<string> {
  const fallback =
    "I'm sorry, I couldn’t find relevant information. Can you please rephrase your question?";
  const context = docs.map((doc, i) => `Doc ${i + 1}:\n${doc}`).join('\n\n');

  return await withSpan(
    'generateSummaryLLM',
    async span => {
      if (provider === 'openai' && openai) {
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant that summarizes internal documentation in response to a user's query.

RULES:
- Base your answer ONLY on the documents provided.
- If no relevant information exists, respond with: "${fallback}"
- DO NOT guess or include information not in the documents.
- Answer must be concise and limited to 3 sentences max.
- Use exact or related terms from the query when possible (e.g., "username assistance", "identity verification").

Output must be clear, professional, and actionable.`,
              },
              {
                role: 'user',
                content: `Query: "${query}"\n\nDocuments:\n${context}`,
              },
            ],
            temperature: 0.2,
          });

          const summary = response?.choices?.[0]?.message?.content?.trim() || '';
          const usedFallback =
            summary.toLowerCase().includes('rephrase') || summary.length < 3;

          if (usedFallback) span.addEvent('Fallback triggered');

          span.setAttribute('summaryLength', summary.length);
          span.setAttribute('wasFallbackUsed', usedFallback);

          return usedFallback ? fallback : summary;
        } catch (error: any) {
          span.recordException(error);
          span.setAttribute('wasFallbackUsed', true);
          return fallback;
        }
      }

      // Mock mode fallback
      const mockSummary = `Mock summary for "${query}" based on ${docs.length} documents.`;
      span.setAttribute('wasFallbackUsed', false);
      span.setAttribute('summaryLength', mockSummary.length);
      return mockSummary;
    },
    {
      query,
      docCount: docs.length,
      provider,
    },
    parentSpan
  );
}