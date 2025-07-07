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
import type { CustomWorld } from '../support/world';
import { AxeBuilder } from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { createHtmlReport } from 'axe-html-reporter';
import fs from 'fs';
import path from 'path';

Given('I go to the following {string}', {timeout: 60_000}, async function(this: CustomWorld, url: string) {
  console.log(`Navigating to: ${url}`);
  
  if (!this.page) {
    console.error('Page object is undefined in step definition');
    throw new Error('Page object is not available. Check browser initialization in hooks.');
  }
  
  try {
    await this.page.goto(url, { waitUntil: 'networkidle' });
    console.log(`Successfully navigated to: ${url}`);
  } catch (error) {
    console.error(`Error navigating to ${url}:`, error);
    throw error;
  }
});

When('I run the a11y check', async function (this: CustomWorld) {
  console.log('Running accessibility check');

  if (!this.page) {
    throw new Error('Page object is not available for accessibility testing');
  }

  try {
    const accessibilityScanResults = await new AxeBuilder({ page: this.page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    this.a11yResults = accessibilityScanResults;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.resolve('reports/accessibility');
    const reportPath = path.join(reportDir, `a11y-report-${timestamp}.html`);

    fs.mkdirSync(reportDir, { recursive: true });

    const html = createHtmlReport({
      results: accessibilityScanResults,
      options: {
        projectKey: 'cucumber-a11y',
        customSummary: `Found ${accessibilityScanResults.violations.length} accessibility issues.`,
      },
    });

    fs.writeFileSync(reportPath, html);

    console.log(`Accessibility HTML report saved to: ${reportPath}`);
  } catch (error) {
    console.error('Error running accessibility check:', error);
    throw error;
  }
});

Then('I should not see any violations', function(this: CustomWorld) {
  console.log('Checking for accessibility violations');
  
  if (!this.a11yResults) {
    console.error('No accessibility results found');
    throw new Error('No accessibility scan results available');
  }
  
  try {
    // Get the number of violations
    const violationCount = this.a11yResults.violations.length;
    console.log(`Found ${violationCount} accessibility violations`);
    
    // Assert that there are no violations
    expect(violationCount, 
      `Expected no accessibility violations but found ${violationCount}`).toBe(0);
    
    console.log('Accessibility check passed - no violations found');
  } catch (error) {
    console.error('Accessibility test failed:', error);
    throw error;
  }
});