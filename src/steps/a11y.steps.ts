import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import { AxeBuilder } from '@axe-core/playwright';
import { expect } from '@playwright/test';

Given('I go to the following {string}', async function(this: CustomWorld, url: string) {
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

When('I run the a11y check', async function(this: CustomWorld) {
  console.log('🔍 Running accessibility check');
  
  if (!this.page) {
    console.error('Page object is undefined in a11y check');
    throw new Error('Page object is not available for accessibility testing');
  }
  
  try {
    // Use a type assertion to work around the compatibility issue
    const accessibilityScanResults = await new AxeBuilder({ page: this.page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Store the results in the world object for later steps
    this.a11yResults = accessibilityScanResults;
    console.log(`Accessibility scan completed with ${accessibilityScanResults.violations.length} violations`);
    
    // Log a summary of violations if any exist
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations summary:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.id}: ${violation.description} (Impact: ${violation.impact})`);
      });
    }
  } catch (error) {
    console.error('Error running accessibility check:', error);
    throw error;
  }
});

Then('I should not see any violations', function(this: CustomWorld) {
  console.log('🔍 Checking for accessibility violations');
  
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