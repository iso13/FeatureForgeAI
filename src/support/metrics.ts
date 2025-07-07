/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import client from 'prom-client';

export const register = new client.Registry();

// Histogram to track scenario duration
export const testDuration = new client.Histogram({
  name: 'test_duration_seconds',
  help: 'Duration of each test scenario in seconds',
  labelNames: ['feature', 'scenario', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

register.registerMetric(testDuration);

// Collect default Node.js metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });