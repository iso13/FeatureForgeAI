import { Given, When, Then } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { AxeBuilder } from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { createHtmlReport } from 'axe-html-reporter';
import fs from 'fs';
import path from 'path';


When('the user selects patient Jane Doe2', async function (this: CustomWorld) {
  try {
    await this.page.getByPlaceholder('Search or create patient...').click();
    const dropdown = this.page.locator('#patient-search-dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    const patientOption = dropdown.getByText('Jane Doe2', { exact: true });
    await patientOption.click();
  } catch (error) {
    await this.page.screenshot({ path: 'reports/screenshots/select-patient-failure.png' });
    throw new Error(`Failed to select patient Jane Doe2: ${error}`);
  }
});

Then('the page should pass basic accessibility checks', async function (this: CustomWorld) {
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
      projectKey: 'sully-ai',
      customSummary: `Found ${accessibilityScanResults.violations.length} accessibility issues.`,
    },
  });

  fs.writeFileSync(reportPath, html);
  console.log(`Accessibility HTML report saved to: ${reportPath}`);

  const violations = accessibilityScanResults.violations.length;
  expect(violations, `Expected no accessibility violations but found ${violations}`).toBe(0);
});