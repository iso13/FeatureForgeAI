// src/utils/dom-generator/step-generator.ts
/**
 * Handles Playwright step definitions generation
 * Copyright (c) 2024–2025 David Tran
 */

import type { AnalysisResult, InteractiveElement } from "./types.js";

export class StepGenerator {
  generateStepDefinitions(
    analysis: AnalysisResult,
    featureName: string,
  ): string {
    const steps = new Set<string>();

    console.log("🔧 Generating step definitions...");
    console.log(`   URL: ${analysis.url}`);
    console.log(
      `   Elements to create steps for: ${analysis.elements?.length || 0}`,
    );

    // Add navigation steps
    this.addNavigationSteps(steps, analysis);

    // Add input steps based on found elements
    this.addInputSteps(steps, analysis);

    // Add button steps based on found elements
    this.addButtonSteps(steps, analysis);

    // Add verification steps
    this.addVerificationSteps(steps);

    // Add performance and edge case steps
    this.addSpecialCaseSteps(steps);

    console.log(`   Generated ${steps.size} unique step definitions`);

    return this.buildStepDefinitionsFile(steps);
  }

  /**
   * Add navigation and page loading steps
   */
  private addNavigationSteps(
    steps: Set<string>,
    analysis: AnalysisResult,
  ): void {
    steps.add(`Given('I am on the {string} login page', async function (pageName: string) {
  try {
    await this.page.goto('${analysis.url}');
    await this.page.waitForLoadState('networkidle');
    const title = await this.page.title();
    expect(title).toContain(pageName);
  } catch (error) {
    throw new Error(\`Failed to navigate to \${pageName} login page: \${error}\`);
  }
});`);

    steps.add(`Given('the page has loaded completely', async function () {
  try {
    await this.page.waitForTimeout(2000);
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
  } catch (error) {
    throw new Error(\`Page did not load completely: \${error}\`);
  }
});`);
  }

  /**
   * Add input field interaction steps
   */
  private addInputSteps(steps: Set<string>, analysis: AnalysisResult): void {
    const inputs =
      analysis.elements?.filter((el) => el.action === "enter text in") || [];

    if (inputs.length > 0) {
      console.log(`   Adding input steps for ${inputs.length} input elements`);

      // Standard text entry step
      steps.add(`When('I enter {string} in the {string} field', async function (text: string, fieldName: string) {
  try {
    let selector = '';
    
    // Direct selector mapping - standard Playwright only
    switch (fieldName.toLowerCase()) {
      case 'username':
        selector = '[data-test="username"]';
        break;
      case 'password':
        selector = '[data-test="password"]';
        break;
      case 'email':
        selector = '[data-test="email"], input[type="email"]';
        break;
      default:
        selector = \`[data-test="\${fieldName.toLowerCase()}"]\`;
    }
    
    await this.page.fill(selector, text);
  } catch (error) {
    throw new Error(\`Failed to enter text in \${fieldName} field: \${error}\`);
  }
});`);

      // Clear field step
      steps.add(`When('I leave the {string} field empty', async function (fieldName: string) {
  try {
    let selector = '';
    
    switch (fieldName.toLowerCase()) {
      case 'username':
        selector = '[data-test="username"]';
        break;
      case 'password':
        selector = '[data-test="password"]';
        break;
      case 'email':
        selector = '[data-test="email"], input[type="email"]';
        break;
      default:
        selector = \`[data-test="\${fieldName.toLowerCase()}"]\`;
    }
    
    await this.page.fill(selector, '');
  } catch (error) {
    throw new Error(\`Failed to clear \${fieldName} field: \${error}\`);
  }
});`);
    }
  }

  /**
   * Add button click interaction steps
   */
  private addButtonSteps(steps: Set<string>, analysis: AnalysisResult): void {
    const buttons =
      analysis.elements?.filter((el) => el.action === "click") || [];

    if (buttons.length > 0) {
      console.log(
        `   Adding button steps for ${buttons.length} clickable elements`,
      );

      steps.add(`When('I click the {string} button', async function (buttonName: string) {
  try {
    let selector = '';
    
    switch (buttonName.toLowerCase()) {
      case 'login':
      case 'login button':
        selector = '[data-test="login-button"]';
        break;
      case 'submit':
        selector = '[type="submit"], button:has-text("Submit")';
        break;
      case 'save':
        selector = 'button:has-text("Save")';
        break;
      default:
        selector = \`[data-test="\${buttonName.toLowerCase()}-button"]\`;
    }
    
    await this.page.click(selector);
    await this.page.waitForTimeout(2000);
  } catch (error) {
    throw new Error(\`Failed to click \${buttonName} button: \${error}\`);
  }
});`);
    }
  }

  /**
   * Add verification and assertion steps
   */
  private addVerificationSteps(steps: Set<string>): void {
    console.log("   Adding verification steps...");

    // Success verification steps
    steps.add(`Then('I should be redirected to the products page', async function () {
  try {
    await this.page.waitForURL('**/inventory.html', { timeout: 10000 });
    const currentUrl = this.page.url();
    expect(currentUrl).toContain('inventory');
  } catch (error) {
    throw new Error(\`Failed to redirect to products page: \${error}\`);
  }
});`);

    steps.add(`Then('I should see the inventory list', async function () {
  try {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
    const inventoryList = this.page.locator('.inventory_list');
    await expect(inventoryList).toBeVisible();
  } catch (error) {
    throw new Error(\`Failed to see inventory list: \${error}\`);
  }
});`);

    steps.add(`Then('I should be logged in successfully', async function () {
  try {
    await Promise.race([
      this.page.waitForURL('**/inventory.html', { timeout: 8000 }),
      this.page.waitForSelector('.inventory_list', { timeout: 8000 })
    ]);
    
    const currentUrl = this.page.url();
    const hasInventory = await this.page.locator('.inventory_list').isVisible();
    expect(currentUrl.includes('inventory') || hasInventory).toBeTruthy();
  } catch (error) {
    throw new Error(\`Login was not successful: \${error}\`);
  }
});`);

    // Error verification steps
    steps.add(`Then('I should see an error message', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    await expect(errorElement).toBeVisible();
  } catch (error) {
    throw new Error(\`Expected error message not found: \${error}\`);
  }
});`);

    steps.add(`Then('I should see a locked out error message', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('locked out');
  } catch (error) {
    throw new Error(\`Locked out error message not found: \${error}\`);
  }
});`);

    steps.add(`Then('I should see validation error messages', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    const errorText = await errorElement.textContent();
    expect(errorText).toMatch(/(required|Username|Password)/i);
  } catch (error) {
    throw new Error(\`Validation error messages not found: \${error}\`);
  }
});`);

    steps.add(`Then('I should remain on the login page', async function () {
  try {
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('inventory');
    
    const loginButton = this.page.locator('[data-test="login-button"]');
    await expect(loginButton).toBeVisible();
  } catch (error) {
    throw new Error(\`Not on login page as expected: \${error}\`);
  }
});`);
  }

  /**
   * Add special case and performance steps
   */
  private addSpecialCaseSteps(steps: Set<string>): void {
    console.log("   Adding special case steps...");

    // Performance and visual glitch steps
    steps.add(`Then('I may experience visual glitches on the products page', async function () {
  try {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
    // Visual glitches are UI-specific - just verify we reached the page
  } catch (error) {
    throw new Error(\`Failed to reach products page: \${error}\`);
  }
});`);

    steps.add(`Then('the page load may be slower than normal', async function () {
  try {
    // Extended timeout for performance_glitch_user
    await this.page.waitForSelector('.inventory_list', { timeout: 15000 });
  } catch (error) {
    throw new Error(\`Page did not load even with extended timeout: \${error}\`);
  }
});`);

    steps.add(`Then('the login button should remain disabled or show error', async function () {
  try {
    // Check for error message (SauceDemo's validation approach)
    const hasError = await this.page.locator('[data-test="error"]').isVisible();
    expect(hasError).toBeTruthy();
  } catch (error) {
    throw new Error(\`Expected validation error not found: \${error}\`);
  }
});`);

    // Generic fallback step
    steps.add(`Then('the system should respond appropriately', async function () {
  try {
    await this.page.waitForTimeout(1000);
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('error');
  } catch (error) {
    throw new Error(\`System did not respond appropriately: \${error}\`);
  }
});`);
  }

  /**
   * Build the complete step definitions file
   */
  private buildStepDefinitionsFile(steps: Set<string>): string {
    const header = `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Auto-generated step definitions using standard Playwright methods
// No custom dependencies required - works with any Cucumber-Playwright setup
// Generated from DOM analysis of: ${new Date().toISOString()}

`;

    const stepsContent = Array.from(steps).join("\n\n");

    return header + stepsContent;
  }

  /**
   * Generate steps for specific element types (extensible method)
   */
  generateStepsForElementType(
    elements: InteractiveElement[],
    elementType: "input" | "button" | "select" | "link",
  ): string[] {
    const steps: string[] = [];

    const filteredElements = elements.filter((el) => {
      switch (elementType) {
        case "input":
          return el.type === "input" || el.type === "textarea";
        case "button":
          return el.type === "button" || el.action === "click";
        case "select":
          return el.type === "select";
        case "link":
          return el.type === "a";
        default:
          return false;
      }
    });

    switch (elementType) {
      case "input":
        filteredElements.forEach((el) => {
          steps.push(`When('I enter {string} in the ${this.getElementName(el)} field', async function (text: string) {
  await this.page.fill('${el.selector}', text);
});`);
        });
        break;

      case "button":
        filteredElements.forEach((el) => {
          steps.push(`When('I click the ${this.getElementName(el)} button', async function () {
  await this.page.click('${el.selector}');
  await this.page.waitForTimeout(1000);
});`);
        });
        break;

      case "select":
        filteredElements.forEach((el) => {
          steps.push(`When('I select {string} from the ${this.getElementName(el)} dropdown', async function (option: string) {
  await this.page.selectOption('${el.selector}', option);
});`);
        });
        break;

      case "link":
        filteredElements.forEach((el) => {
          steps.push(`When('I click the ${this.getElementName(el)} link', async function () {
  await this.page.click('${el.selector}');
  await this.page.waitForLoadState('networkidle');
});`);
        });
        break;
    }

    return steps;
  }

  /**
   * Get a clean element name for step generation
   */
  private getElementName(element: InteractiveElement): string {
    if (element.testId) {
      return element.testId.replace(/[-_]/g, " ").toLowerCase();
    }

    if (element.text && element.text.length > 0) {
      return element.text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim();
    }

    return element.type;
  }

  /**
   * Generate step definitions with custom configuration
   */
  generateStepDefinitionsWithConfig(
    analysis: AnalysisResult,
    featureName: string,
    config: {
      includePerformanceSteps?: boolean;
      includeAccessibilitySteps?: boolean;
      includeErrorHandling?: boolean;
      customTimeout?: number;
    } = {},
  ): string {
    const steps = new Set<string>();

    // Add standard steps
    this.addNavigationSteps(steps, analysis);
    this.addInputSteps(steps, analysis);
    this.addButtonSteps(steps, analysis);
    this.addVerificationSteps(steps);

    // Add optional step types based on config
    if (config.includePerformanceSteps) {
      this.addPerformanceSteps(steps, config.customTimeout);
    }

    if (config.includeAccessibilitySteps) {
      this.addAccessibilitySteps(steps);
    }

    if (config.includeErrorHandling !== false) {
      // Default to true
      this.addSpecialCaseSteps(steps);
    }

    return this.buildStepDefinitionsFile(steps);
  }

  /**
   * Add performance-focused step definitions
   */
  private addPerformanceSteps(
    steps: Set<string>,
    customTimeout?: number,
  ): void {
    const timeout = customTimeout || 5000;

    steps.add(`Then('the page should load within {int} seconds', async function (maxSeconds: number) {
  const startTime = Date.now();
  await this.page.waitForLoadState('networkidle', { timeout: maxSeconds * 1000 });
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(maxSeconds * 1000);
});`);
  }

  /**
   * Add accessibility-focused step definitions
   */
  private addAccessibilitySteps(steps: Set<string>): void {
    steps.add(`Then('the page should be accessible', async function () {
  // Basic accessibility checks
  const missingAltImages = await this.page.locator('img:not([alt])').count();
  expect(missingAltImages).toBe(0);
  
  const missingLabels = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count();
  expect(missingLabels).toBe(0);
});`);
  }
}
