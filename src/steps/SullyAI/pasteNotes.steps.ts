import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../../support/world';

Given('the user logs into Sully AI', { timeout: 60_000 }, async function (this: CustomWorld) {
  try {
    await this.page.goto('https://app.sully.ai/');
    await this.page.getByPlaceholder('Email').fill('sullyqatest+11@gmail.com');
    await this.page.getByPlaceholder('Password').fill('Sully@321');
    await this.page.getByRole('button', { name: 'Login' }).click();

    // Wait for post-login confirmation element
    await this.page.getByText('Hello Tran', { exact: true }).waitFor({ timeout: 15000 });

    console.log('Login successful');
  } catch (error) {
    throw new Error(`Login failed: ${error}`);
  }
});

When('the user selects patient Jane Doe2 and pastes additional notes', async function (this: CustomWorld) {
  try {
    // Select patient from dropdown
    await this.page.getByPlaceholder('Search or create patient...').click();
    const dropdown = this.page.locator('#patient-search-dropdown');
    await dropdown.waitFor({ state: 'visible' });
    await dropdown.getByText('Jane Doe2', { exact: true }).click();

    // Focus the transcript input without triggering context menu
    await this.page.getByPlaceholder('Transcript appears here when').click();

    // Paste additional notes
    await this.page.getByRole('button', { name: 'Add Notes' }).click();
    await this.page.getByPlaceholder('Type additional notes here').fill(
      'Female presenting with evaluation of her health including sleep quality and dietary habits...'
    );
    await this.page.getByRole('button', { name: 'Generate Note' }).click();
  } catch (error) {
    await this.page.screenshot({ path: 'reports/screenshots/paste-notes-failure.png' });
    throw new Error(`Failed to select Jane Doe2 and paste notes: ${error}`);
  }
});

Then('the system should generate a clinical summary', { timeout: 40000 }, async function (this: CustomWorld) {
  try {
    // Wait for any progress indicator to disappear
    await expect(this.page.getByRole('progressbar')).toHaveCount(0, { timeout: 20000 });

    // Flexible: look for "Evaluate sleep quality" anywhere in a visible block of text
    const summary = this.page.locator('text=/sleep quality|dietary habits|evaluation/i').first();
    await expect(summary).toBeVisible({ timeout: 20000 });

    console.log('Clinical summary generated and visible');
  } catch (error) {
    await this.page.screenshot({ path: 'reports/screenshots/summary-not-visible.png' });
    throw new Error(`Summary did not finish generating: ${error instanceof Error ? error.message : error}`);
  }
});