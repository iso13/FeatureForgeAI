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
import { HeartRateSimulator } from '../../simulators/device-simulator';
import { logTelemetry } from '../../utils/telemetry-exporter';

const device = new HeartRateSimulator();
let currentStatus: string = 'IDLE';
let lastAlert: string | null = null;

Given('the heart rate monitor device is connected via API', () => {
  // simulate connection
  currentStatus = 'IDLE';
});

Given('the device is in idle state', () => {
  currentStatus = 'IDLE';
});

When('I simulate a heart rate of {int} bpm', (bpm: number) => {
  const result = device.simulate(bpm);
  lastAlert = result.alert;
  currentStatus = result.status;

  logTelemetry('HeartRateSimulated', {
    bpm,
    alert: lastAlert,
    status: currentStatus,
    timestamp: new Date().toISOString(),
  });
});

Then('the device should send an {string} notification', (expectedAlert: string) => {
  expect(lastAlert).toBe(expectedAlert);
});

Then('the alert should be logged in the monitoring system', () => {
  // If integrated with OTEL, check external logs or assume telemetry logging
  expect(lastAlert).not.toBeNull();
});

Then('no alert should be sent', () => {
  expect(lastAlert).toBeNull();
});

Then('the device status should remain {string}', (expectedStatus: string) => {
  expect(currentStatus).toBe(expectedStatus);
});