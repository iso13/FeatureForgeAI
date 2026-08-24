// src/core/intelligence/layerValidator.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import type { Page } from 'playwright';
import type { Span } from '@opentelemetry/api';
import { withSpan } from '../../plugins/telemetry/traceHelper';
import type { LayerResult, FailureLayer } from './failureClassifier';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  responseBody?: unknown;
  requestBody?: unknown;
  duration?: number;
}

export interface LayerValidationContext {
  stepText: string;
  scenarioName: string;
  featureName: string;
  page?: Page;
  networkRequests?: NetworkRequest[];
  parentSpan?: Span;
}

export interface LayerValidationReport {
  ui: LayerResult;
  api: LayerResult;
  businessLogic: LayerResult;
  overallPassed: boolean;
  capturedRequests: NetworkRequest[];
}

// ─── Network Request Capture ──────────────────────────────────────────────────

/**
 * Attaches network request/response listeners to the Playwright page.
 * Call this in BeforeStep to start capturing, then read in AfterStep.
 */
export function attachNetworkCapture(page: Page): NetworkRequest[] {
  const captured: NetworkRequest[] = [];

  page.on('request', (request) => {
    captured.push({
      url: request.url(),
      method: request.method(),
      requestBody: request.postDataJSON?.() ?? undefined,
    });
  });

  page.on('response', async (response) => {
    const entry = captured.find(
      (r) => r.url === response.url() && r.method === response.request().method(),
    );
    if (entry) {
      entry.status = response.status();
      try {
        entry.responseBody = await response.json();
      } catch {
        // Non-JSON response — ignore
      }
    }
  });

  return captured;
}

// ─── UI Layer Validator ───────────────────────────────────────────────────────

/**
 * Validates the UI layer by checking page state at the time of failure.
 * Captures visible text, current URL, and any error banners.
 */
export async function validateUILayer(
  page: Page,
  stepText: string,
  parentSpan?: Span,
): Promise<LayerResult> {
  return withSpan(
    'validateUILayer',
    async (span) => {
      try {
        const url = page.url();
        const title = await page.title();
        const bodyText = await page.locator('body').innerText().catch(() => '');

        // Check for common error indicators
        const errorIndicators = [
          '[role="alert"]',
          '.error',
          '.error-message',
          '[data-testid*="error"]',
          '[class*="error"]',
        ];

        let errorText = '';
        for (const selector of errorIndicators) {
          try {
            const el = page.locator(selector).first();
            const visible = await el.isVisible();
            if (visible) {
              errorText = await el.innerText();
              break;
            }
          } catch {
            // Selector not found — continue
          }
        }

        span.setAttribute('ui.url', url);
        span.setAttribute('ui.title', title);
        span.setAttribute('ui.errorText', errorText);
        span.setAttribute('ui.step', stepText);

        const passed = !errorText;

        return {
          layer: 'UI' as FailureLayer,
          passed,
          actual: errorText || `Page: ${title} at ${url}`,
          expected: `No error indicators for step: "${stepText}"`,
          evidence: errorText
            ? `Error element found: "${errorText}"`
            : `Page rendered cleanly at ${url}`,
        };
      } catch (error: any) {
        span.recordException(error);
        return {
          layer: 'UI' as FailureLayer,
          passed: false,
          actual: error.message,
          expected: 'UI layer accessible',
          evidence: 'UI validation threw an exception',
        };
      }
    },
    { 'step.text': stepText },
    parentSpan,
  );
}

// ─── API Layer Validator ──────────────────────────────────────────────────────

/**
 * Validates the API contract layer by inspecting captured network requests.
 * Identifies failed requests, unexpected status codes, and response shape issues.
 */
export async function validateAPILayer(
  networkRequests: NetworkRequest[],
  stepText: string,
  parentSpan?: Span,
): Promise<LayerResult> {
  return withSpan(
    'validateAPILayer',
    async (span) => {
      const apiRequests = networkRequests.filter(
        (r) =>
          r.url.includes('/api/') ||
          r.url.includes('/graphql') ||
          r.url.includes('/rest/') ||
          r.method !== 'GET' ||
          (r.status && r.status >= 400),
      );

      const failedRequests = apiRequests.filter(
        (r) => r.status && r.status >= 400,
      );

      span.setAttribute('api.requestCount', apiRequests.length);
      span.setAttribute('api.failedCount', failedRequests.length);
      span.setAttribute('api.step', stepText);

      if (failedRequests.length > 0) {
        const details = failedRequests
          .map((r) => `${r.method} ${r.url} → ${r.status}`)
          .join(', ');

        return {
          layer: 'API_CONTRACT' as FailureLayer,
          passed: false,
          actual: details,
          expected: 'All API requests return 2xx status codes',
          evidence: `${failedRequests.length} failed API request(s): ${details}`,
        };
      }

      if (apiRequests.length === 0) {
        return {
          layer: 'API_CONTRACT' as FailureLayer,
          passed: true,
          evidence: 'No API requests captured during this step',
        };
      }

      return {
        layer: 'API_CONTRACT' as FailureLayer,
        passed: true,
        evidence: `${apiRequests.length} API request(s) all returned successful status codes`,
      };
    },
    { 'step.text': stepText },
    parentSpan,
  );
}

// ─── Business Logic Validator ─────────────────────────────────────────────────

/**
 * Validates business logic by cross-referencing the Gherkin step intent
 * against the captured API responses. Looks for semantic mismatches between
 * what the step asserts and what the backend actually returned.
 */
export async function validateBusinessLogicLayer(
  stepText: string,
  networkRequests: NetworkRequest[],
  errorMessage: string,
  parentSpan?: Span,
): Promise<LayerResult> {
  return withSpan(
    'validateBusinessLogicLayer',
    async (span) => {
      // Extract API responses for analysis
      const responses = networkRequests
        .filter((r) => r.responseBody !== undefined)
        .map((r) => ({
          url: r.url,
          status: r.status,
          body: r.responseBody,
        }));

      span.setAttribute('logic.responseCount', responses.length);
      span.setAttribute('logic.step', stepText);

      // Check for business logic assertion failures
      // These are cases where the API returned 200 but the data is wrong
      const successfulResponses = networkRequests.filter(
        (r) => r.status && r.status >= 200 && r.status < 300,
      );

      const hasAssertionFailure =
        errorMessage.toLowerCase().includes('expect') ||
        errorMessage.toLowerCase().includes('assertion') ||
        errorMessage.toLowerCase().includes('tobе') ||
        errorMessage.toLowerCase().includes('toequal') ||
        errorMessage.toLowerCase().includes('received') ||
        errorMessage.toLowerCase().includes('expected');

      if (hasAssertionFailure && successfulResponses.length > 0) {
        // API succeeded but assertion failed — business logic issue
        const responseSnapshot = JSON.stringify(
          successfulResponses.map((r) => ({
            url: r.url,
            body: r.responseBody,
          })),
          null,
          2,
        ).substring(0, 500);

        span.setAttribute('logic.businessLogicFailure', true);

        return {
          layer: 'BUSINESS_LOGIC' as FailureLayer,
          passed: false,
          actual: `API returned success but assertion failed: ${errorMessage}`,
          expected: `Step "${stepText}" business rule to be satisfied`,
          evidence: `API responses were successful but data did not match expected business outcome.\nResponse snapshot: ${responseSnapshot}`,
        };
      }

      return {
        layer: 'BUSINESS_LOGIC' as FailureLayer,
        passed: true,
        evidence: 'No business logic violations detected',
      };
    },
    { 'step.text': stepText },
    parentSpan,
  );
}

// ─── Full Layer Validation ────────────────────────────────────────────────────

/**
 * Runs all layer validators and returns a consolidated report.
 * This is the main entry point called from hooks.ts AfterStep.
 */
export async function validateAllLayers(
  context: LayerValidationContext,
  errorMessage: string,
): Promise<LayerValidationReport> {
  const { stepText, page, networkRequests = [], parentSpan } = context;

  const [uiResult, apiResult, logicResult] = await Promise.all([
    page
      ? validateUILayer(page, stepText, parentSpan)
      : Promise.resolve({
          layer: 'UI' as FailureLayer,
          passed: true,
          evidence: 'No browser page available (non-UI step)',
        }),
    validateAPILayer(networkRequests, stepText, parentSpan),
    validateBusinessLogicLayer(
      stepText,
      networkRequests,
      errorMessage,
      parentSpan,
    ),
  ]);

  return {
    ui: uiResult,
    api: apiResult,
    businessLogic: logicResult,
    overallPassed: uiResult.passed && apiResult.passed && logicResult.passed,
    capturedRequests: networkRequests,
  };
}