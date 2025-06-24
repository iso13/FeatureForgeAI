import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../../support/world';

Given('investor records and fund documents are available', async function (this: CustomWorld) {
  this.agent = new (await import('../../ai/agentTester')).CapitalCallAgent();
  this.agent.setContext({
    investorRecordsAvailable: true,
    fundDocumentsAvailable: true,
    emailServiceAvailable: true,
  });
});

When('the agent runs the capital call workflow', async function (this: CustomWorld) {
  if (!this.agent) throw new Error('Agent not initialized');
  this.workflowSteps = await this.agent.run();
});

Then('the workflow should complete successfully', async function (this: CustomWorld) {
  expect(this.agent?.getStatus()).toBe('completed');
  expect(this.workflowSteps?.length).toBeGreaterThan(0);
});

Then('the generated summary should contain {string}', async function (this: CustomWorld, keyword: string) {
  const summary = this.agent?.getSummary();
  expect(summary).toContain(keyword);
});