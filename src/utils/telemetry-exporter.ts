/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

export function logTelemetry(eventName: string, details: object) {
    console.log(`[OTEL] ${eventName}`, JSON.stringify(details));
  
    // OPTIONAL: Send to Prometheus, Jaeger, etc.
    // e.g., sendMetric('heart_rate_alert_triggered', 1);
  }