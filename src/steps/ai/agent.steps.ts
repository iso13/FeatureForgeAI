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
import { CapitalCallAgent } from '../../ai/agentTester';
import type { CustomWorld } from '../../support/world';

Given('the AI agent has access to investor records and fund agreements', function (this: CustomWorld) {
  this.agent = new CapitalCallAgent();
  this.agent.setContext({ investorRecordsAvailable: true, fundDocumentsAvailable: true });
});

Given('the investor records are incomplete', function (this: CustomWorld) {
  this.agent?.setContext({ investorRecordsAvailable: false });
});

Given('the notification service is temporarily unavailable', function (this: CustomWorld) {
  this.agent?.setContext({ emailServiceAvailable: false });
});

Given('the agent previously failed due to missing data', function (this: CustomWorld) {
  this.agent?.setContext({ previouslyFailedDueToMissingData: true });
});

When('the AI agent is instructed to notify investors of a capital call', async function (this: CustomWorld) {
  // Do NOT re-instantiate agent here – it’s already created in Background
  this.workflowSteps = await this.agent!.runInvestorNotificationWorkflow('fund-001');
});

When('the AI agent attempts to generate a capital call summary', async function (this: CustomWorld) {
  this.workflowSteps = await this.agent?.runPartialWorkflow('generate-summary');
});

When('the AI agent attempts to send notifications', async function (this: CustomWorld) {
  this.workflowSteps = await this.agent?.runPartialWorkflow('send-notifications');
});

When('the administrator provides the missing investor records', function (this: CustomWorld) {
  this.agent?.setContext({ investorRecordsAvailable: true });
});

When('the agent resumes the workflow', async function (this: CustomWorld) {
  this.workflowSteps = await this.agent?.resumeWorkflow();
});

Then('the agent should generate a capital call summary', function (this: CustomWorld) {
  const step = this.agent?.getSteps().find(s => s.tool === 'LLM' && s.output.includes('Summary generated'));
  expect(step).to.exist;
});

Then('the agent should validate compliance of the generated summary', function (this: CustomWorld) {
  const step = this.agent?.getSteps().find(s => s.tool === 'ComplianceChecker');
  expect(step?.output).to.include('Compliant');
});

Then('the agent should send the notification to each investor', function (this: CustomWorld) {
  const step = this.agent?.getSteps().find(s => s.tool === 'EmailService' && s.output.includes('Email sent'));
  expect(step).to.exist;
});

Then('each step should be logged with a timestamp', function (this: CustomWorld) {
  const steps = this.agent?.getSteps() || [];
  steps.forEach(step => {
    expect(step).to.have.property('timestamp');
  });
});

Then('the agent should log an error indicating missing data', function (this: CustomWorld) {
  const errorStep = this.agent?.getLogs().find(log => log.type === 'error' && log.message.toLowerCase().includes('missing'));
  expect(errorStep).to.exist;
});

Then('the agent should halt the workflow and notify the administrator', function (this: CustomWorld) {
  const halted = this.agent?.getStatus();
  expect(halted).to.equal('halted');
  const notification = this.agent?.getLogs().find(log => log.message.includes('Administrator notified'));
  expect(notification).to.exist;
});

Then('the agent should retry delivery with exponential backoff', function (this: CustomWorld) {
  const retrySteps = this.agent?.getSteps().filter(s => s.tool === 'EmailService' && s.output.includes('retry')) || [];
  expect(retrySteps.length).to.be.greaterThan(0);
});

Then('the agent should log each retry attempt', function (this: CustomWorld) {
  const retryLogs = this.agent?.getLogs().filter(log => log.message.includes('Retrying email delivery')) || [];
  expect(retryLogs.length).to.be.greaterThan(0);
});

Then('the agent should complete all remaining steps successfully', function (this: CustomWorld) {
  const status = this.agent?.getStatus();
  expect(status).to.equal('completed');
  const steps = this.agent?.getSteps() || [];
  expect(steps.length).to.be.greaterThan(0);
});