// src/steps/playwright.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('I am on the Playwright website', async function (this: CustomWorld) {
  // TS now knows this.page is Playwright.Page | undefined
  if (!this.page) throw new Error('Page is not initialized!');
  await this.page.goto('https://playwright.dev/');
});

When('I go to GET STARTED', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page is not initialized!');
  await this.page.getByRole('link', { name: 'GET STARTED' }).click();
});

Then('I should see the Getting Started page', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page is not initialized!');
  await expect(this.page).toHaveURL('https://playwright.dev/docs/intro');
});