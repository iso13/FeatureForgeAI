// src/core/intelligence/failureClassifier.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export type FailureLayer =
  | 'UI'
  | 'API_CONTRACT'
  | 'BUSINESS_LOGIC'
  | 'DATA_LAYER'
  | 'FULL_STACK'
  | 'UNKNOWN';

export interface LayerResult {
  layer: FailureLayer;
  passed: boolean;
  actual?: string;
  expected?: string;
  evidence?: string;
}

export interface FailureClassification {
  gherkinStep: string;
  scenarioName: string;
  featureName: string;
  failureLayers: FailureLayer[];
  rootCause: FailureLayer;
  confidence: number; // 0–1
  errorMessage: string;
  stackTrace?: string;
  layerResults: LayerResult[];
  timestamp: string;
}

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classifies a step failure into one or more layers using the error message,
 * stack trace, and step text as signals. Uses GPT-4o for intelligent
 * classification when heuristics are inconclusive.
 */
export async function classifyFailure(
  stepText: string,
  scenarioName: string,
  featureName: string,
  errorMessage: string,
  stackTrace?: string,
): Promise<FailureClassification> {
  const layerResults: LayerResult[] = [];
  const failureLayers: FailureLayer[] = [];

  // ── Heuristic classification ─────────────────────────────────────────────

  // UI layer signals
  const uiSignals = [
    'locator',
    'selector',
    'element',
    'visible',
    'click',
    'page.',
    'playwright',
    'timeout waiting',
    'strict mode violation',
    'element not found',
    'toBeVisible',
    'toHaveText',
    'getAttribute',
  ];

  // API contract signals
  const apiSignals = [
    'status code',
    'response.body',
    'axios',
    'fetch',
    '404',
    '500',
    '401',
    '403',
    'network',
    'ECONNREFUSED',
    'request failed',
    'unexpected token',
    'json parse',
    'content-type',
  ];

  // Business logic signals
  const businessLogicSignals = [
    'expected value',
    'assertion failed',
    'toBe(',
    'toEqual(',
    'toMatch',
    'business rule',
    'calculation',
    'incorrect result',
    'wrong amount',
    'invalid state',
    'expect(',
  ];

  // Data layer signals
  const dataSignals = [
    'database',
    'sql',
    'query',
    'drizzle',
    'postgres',
    'undefined column',
    'relation does not exist',
    'foreign key',
    'constraint',
    'migration',
    'schema',
  ];

  const errorLower = (errorMessage + (stackTrace || '')).toLowerCase();

  const uiMatch = uiSignals.some((s) => errorLower.includes(s.toLowerCase()));
  const apiMatch = apiSignals.some((s) =>
    errorLower.includes(s.toLowerCase()),
  );
  const logicMatch = businessLogicSignals.some((s) =>
    errorLower.includes(s.toLowerCase()),
  );
  const dataMatch = dataSignals.some((s) =>
    errorLower.includes(s.toLowerCase()),
  );

  if (uiMatch) {
    failureLayers.push('UI');
    layerResults.push({
      layer: 'UI',
      passed: false,
      evidence: 'UI-related error signals detected in stack trace',
    });
  }

  if (apiMatch) {
    failureLayers.push('API_CONTRACT');
    layerResults.push({
      layer: 'API_CONTRACT',
      passed: false,
      evidence: 'API/network error signals detected in stack trace',
    });
  }

  if (logicMatch) {
    failureLayers.push('BUSINESS_LOGIC');
    layerResults.push({
      layer: 'BUSINESS_LOGIC',
      passed: false,
      evidence: 'Assertion/business logic failure signals detected',
    });
  }

  if (dataMatch) {
    failureLayers.push('DATA_LAYER');
    layerResults.push({
      layer: 'DATA_LAYER',
      passed: false,
      evidence: 'Database/schema error signals detected in stack trace',
    });
  }

  // ── AI classification for ambiguous failures ──────────────────────────────

  let rootCause: FailureLayer = 'UNKNOWN';
  let confidence = 0.5;

  if (failureLayers.length === 0 || failureLayers.length > 2) {
    // Use GPT-4o to classify when heuristics are inconclusive or overlapping
    try {
      const prompt = `You are a software quality engineer analyzing a BDD test failure.

Gherkin Step: "${stepText}"
Scenario: "${scenarioName}"
Feature: "${featureName}"
Error Message: "${errorMessage}"
Stack Trace: "${stackTrace || 'not available'}"

Classify this failure into exactly ONE of these categories:
- UI: Selector broken, element not found, UI rendering issue
- API_CONTRACT: API response shape changed, wrong status code, network error
- BUSINESS_LOGIC: Correct UI and API but wrong business outcome/calculation
- DATA_LAYER: Database schema change, migration issue, data integrity problem
- FULL_STACK: Multiple layers broken simultaneously
- UNKNOWN: Cannot determine from available information

Respond with JSON only:
{
  "rootCause": "CATEGORY",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence explanation"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim() || '{}';
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

      rootCause = parsed.rootCause as FailureLayer;
      confidence = parsed.confidence || 0.5;

      if (!failureLayers.includes(rootCause) && rootCause !== 'UNKNOWN') {
        failureLayers.push(rootCause);
        layerResults.push({
          layer: rootCause,
          passed: false,
          evidence: parsed.reasoning,
        });
      }
    } catch {
      rootCause = failureLayers[0] || 'UNKNOWN';
      confidence = 0.3;
    }
  } else {
    // Single clear layer — high confidence
    rootCause =
      failureLayers.length === 1 ? failureLayers[0] : 'FULL_STACK';
    confidence = failureLayers.length === 1 ? 0.85 : 0.6;

    if (failureLayers.length > 1) {
      failureLayers.push('FULL_STACK');
    }
  }

  return {
    gherkinStep: stepText,
    scenarioName,
    featureName,
    failureLayers: [...new Set(failureLayers)],
    rootCause,
    confidence,
    errorMessage,
    stackTrace,
    layerResults,
    timestamp: new Date().toISOString(),
  };
}