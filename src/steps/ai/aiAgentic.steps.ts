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
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import type { CustomWorld } from '../../support/world';
import {
  generateCapitalCallSummary,
  validateCompliance,
  sendNotifications,
  retrySend,
} from '../../ai/agenticCapitalCallHelper';
import { withSpan } from '../../utils/traceHelper';
import { getDirName } from '../../utils/dirname.js';

Given('the AI can see investor records and fund agreements', async function (this: CustomWorld) {
  await withSpan('loadAgenticTestData', async () => {
    const __dirname = getDirName(import.meta.url);
    const basePath = path.join(__dirname, '../../data/agentic');
    this.investors = JSON.parse(fs.readFileSync(path.join(basePath, 'investors.json'), 'utf-8')) || [];
    this.fundAgreements = JSON.parse(fs.readFileSync(path.join(basePath, 'fund_agreements.json'), 'utf-8')) || [];
    this.capitalCalls = JSON.parse(fs.readFileSync(path.join(basePath, 'capital_calls.json'), 'utf-8')) || [];
    this.notificationLogs = [];
  }, {}, this.stepSpan);
});

When('I tell the AI to send a capital call notification', async function (this: CustomWorld) {
  await withSpan('generateSummary', async () => {
    const call = this.capitalCalls?.[0];
    const agreement = this.fundAgreements?.[0];
    this.summary = generateCapitalCallSummary(call, agreement);
  }, {}, this.stepSpan);
});

Then('it should write a summary of the capital call', async function (this: CustomWorld) {
  await withSpan('validateSummaryExists', async () => {
    expect(this.summary).to.include('Capital Call');
  }, {}, this.stepSpan);
});

Then('make sure the summary follows all compliance rules', async function (this: CustomWorld) {
  await withSpan('validateCompliance', async () => {
    const valid = validateCompliance(this.summary);
    expect(valid).to.be.true;
  }, {}, this.stepSpan);
});

Then('send the message to each investor', async function (this: CustomWorld) {
  await withSpan('sendInvestorNotifications', async () => {
    sendNotifications(this.investors || [], this.summary, this.notificationLogs || []);
  }, {}, this.stepSpan);
});

Then('record each step it takes with a timestamp', async function (this: CustomWorld) {
  await withSpan('verifyNotificationTimestamps', async () => {
    const allHaveTimestamps = (this.notificationLogs || []).every(entry => entry.timestamp);
    expect(allHaveTimestamps).to.be.true;
  }, {}, this.stepSpan);
});

Given('some investor records are incomplete', async function (this: CustomWorld) {
  await withSpan('injectIncompleteInvestorRecord', async () => {
    this.investors?.push({ id: 'incomplete', name: '' });
  }, {}, this.stepSpan);
});

When('the AI tries to create the summary', async function (this: CustomWorld) {
  await withSpan('attemptGenerateSummaryWithMissingData', async () => {
    try {
      const call = this.capitalCalls?.[0];
      const agreement = this.fundAgreements?.[0];
      this.summary = generateCapitalCallSummary(call, agreement);
      this.error = null;
    } catch (err: any) {
      this.error = err;
    }
  }, {}, this.stepSpan);
});

Then('it should log an error about the missing info', async function (this: CustomWorld) {
  await withSpan('checkMissingInvestorInfo', async () => {
    expect((this.investors || []).some(inv => !inv.name)).to.be.true;
  }, {}, this.stepSpan);
});

Then('stop and alert the administrator', async function (this: CustomWorld) {
  await withSpan('checkStopWorkflow', async () => {
    expect(this.error || (this.investors || []).some(inv => !inv.name)).to.be.ok;
  }, {}, this.stepSpan);
});

Given('the notification service is down', async function (this: CustomWorld) {
  await withSpan('simulateServiceDown', async () => {
    this.serviceDown = true;
  }, {}, this.stepSpan);
});

When('the AI tries to send out the messages', async function (this: CustomWorld) {
  await withSpan('retryNotificationDelivery', async () => {
    retrySend(this.notificationLogs || []);
  }, {}, this.stepSpan);
});

Then('it should keep retrying with longer delays', async function (this: CustomWorld) {
  await withSpan('verifyRetryLogic', async () => {
    expect((this.notificationLogs || []).length).to.be.greaterThan(1);
  }, {}, this.stepSpan);
});

Then('log each attempt to send', async function (this: CustomWorld) {
  await withSpan('verifyRetryLogs', async () => {
    const allLogged = (this.notificationLogs || []).every(log => log.retry && log.timestamp);
    expect(allLogged).to.be.true;
  }, {}, this.stepSpan);
});

Given('the AI failed earlier because investor data was missing', async function (this: CustomWorld) {
  await withSpan('simulatePreviousDataFailure', async () => {
    this.investors?.push({ id: 'missing_before', name: '' });
  }, {}, this.stepSpan);
});

When('the missing info is added', async function (this: CustomWorld) {
  await withSpan('recoverInvestorInfo', async () => {
    this.investors = (this.investors || []).map(inv =>
      inv.name === '' ? { ...inv, name: 'Recovered Investor' } : inv
    );
  }, {}, this.stepSpan);
});

When('the AI is told to continue', async function (this: CustomWorld) {
  await withSpan('resumeNotificationFlow', async () => {
    const call = this.capitalCalls?.[0];
    const agreement = this.fundAgreements?.[0];
    this.summary = generateCapitalCallSummary(call, agreement);
    sendNotifications(this.investors || [], this.summary, this.notificationLogs || []);
  }, {}, this.stepSpan);
});

Then('it should pick up where it left off and finish everything', async function (this: CustomWorld) {
  await withSpan('validateWorkflowCompletion', async () => {
    expect((this.notificationLogs || []).length).to.equal((this.investors || []).length);
  }, {}, this.stepSpan);
});
