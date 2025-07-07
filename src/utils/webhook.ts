/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const EMAIL_WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL;
const WEBHOOK_URL = SLACK_WEBHOOK_URL || EMAIL_WEBHOOK_URL;

export async function notifyOnFailure(summary: string, scenario: string): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn('No webhook URL defined. Skipping notification.');
    return;
  }

  const payload = SLACK_WEBHOOK_URL
    ? {
        text: `*AI Summary Validation Failed*\n*Scenario:* ${scenario}\n*Summary:*\n\`\`\`${summary}\`\`\``,
      }
    : {
        subject: `AI Summary Validation Failed: ${scenario}`,
        body: `Scenario: ${scenario}\n\nSummary:\n${summary}`,
      };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Webhook POST failed with status ${response.status}`);
    }
  } catch (err: any) {
    console.error('Webhook notification failed:', err.message);
  }
}