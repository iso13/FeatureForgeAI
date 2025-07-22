// src/steps/hipaa/hipaa.steps.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../../support/world';

Given('a user badge is scanned at the lab entry', async function (this: CustomWorld) {
  this.userId = 'user-123';
  await this.accessApi?.simulateBadgeScan({
    userId: this.userId,
    location: 'surgical-lab',
    success: true,
  });
});

When('access is granted', async function (this: CustomWorld) {
  const decision = await this.accessApi?.getAccessDecision(this.userId!);
  expect(decision?.granted).toBe(true);
});

Then('the event must be logged with user ID, timestamp, and location', async function (this: CustomWorld) {
  const log = await this.accessApi?.getAccessLog(this.userId!);
  expect(log).toMatchObject({
    userId: this.userId,
    location: 'surgical-lab',
  });
  expect(log.timestamp).toBeDefined();
});

Given('a badge scan fails three consecutive times', async function (this: CustomWorld) {
  this.userId = 'user-456';
  for (let i = 0; i < 3; i++) {
    await this.accessApi?.simulateBadgeScan({
      userId: this.userId,
      location: 'surgical-lab',
      success: false,
    });
  }
});

When('the system detects abnormal access attempts', async function (this: CustomWorld) {
  const status = await this.accessApi?.checkAccessAnomalies(this.userId!);
  expect(status?.status).toBe('flagged');
});

Then('a physical security alert must be issued to compliance', async function (this: CustomWorld) {
  const alerts = await this.accessApi?.getSecurityAlerts();
  const userAlerts = alerts?.filter((a) => a.userId === this.userId);
  expect(userAlerts?.length).toBeGreaterThan(0);
});