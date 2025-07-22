// src/support/resolveMockAPI.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// support/resolveMockAPI.ts
import { MockAccessAPI } from '../mocks/mock-access-api';

export function resolveMockAPI(tags: string[]): any {
  if (tags.includes('@hipaa') || tags.includes('@physical')) {
    return new MockAccessAPI();
  }

  // Add more as needed:
  // if (tags.includes('@rag')) return new MockRAGAPI();

  return undefined;
}