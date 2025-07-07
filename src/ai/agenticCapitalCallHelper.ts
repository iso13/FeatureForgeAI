/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

export function generateCapitalCallSummary(call: any, agreement: any): string {
  return `Capital Call for ${agreement.fundName} on ${call.date} for $${call.amount}`;
}

export function validateCompliance(summary: string): boolean {
  return summary.includes('Capital Call') && summary.includes('$');
}

export function sendNotifications(investors: any[], summary: string, log: any[]): void {
  investors.forEach(inv => {
    log.push({
      investorId: inv.id,
      status: 'sent',
      timestamp: new Date().toISOString(),
      message: summary,
    });
  });
}

export function retrySend(log: any[], maxRetries = 3): void {
  let attempts = 0;
  while (attempts < maxRetries) {
    log.push({ retry: attempts + 1, timestamp: new Date().toISOString() });
    attempts++;
  }
}