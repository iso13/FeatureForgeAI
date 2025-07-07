/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// scripts/gherkinParser.ts

/**
 * Simple Gherkin parser for validating basic structure.
 * @param content Raw Gherkin file content
 * @returns List of validation error messages
 */
export function parseGherkin(content: string): string[] {
  const errors: string[] = [];

  if (!content.includes('Feature:')) {
    errors.push('Missing "Feature:" declaration');
  }

  // Example: check if there’s at least one Scenario
  if (!content.includes('Scenario:')) {
    errors.push('Missing at least one "Scenario:" declaration');
  }

  return errors;
}