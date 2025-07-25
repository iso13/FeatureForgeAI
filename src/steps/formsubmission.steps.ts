import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Auto-generated step definitions using standard Playwright methods
// No custom dependencies required - works with any Cucumber-Playwright setup
// Generated from DOM analysis of: 2025-07-25T21:02:00.061Z

Given('I am on the {string} login page', async function (pageName: string) {
  try {
    await this.page.goto('https://bolt.playrealbrokerage.com/register');
    await this.page.waitForLoadState('networkidle');
    const title = await this.page.title();
    expect(title).toContain(pageName);
  } catch (error) {
    throw new Error(`Failed to navigate to ${pageName} login page: ${error}`);
  }
});

Given('the page has loaded completely', async function () {
  try {
    await this.page.waitForTimeout(2000);
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
  } catch (error) {
    throw new Error(`Page did not load completely: ${error}`);
  }
});

When('I enter {string} in the {string} field', async function (text: string, fieldName: string) {
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
        selector = `[data-test="${fieldName.toLowerCase()}"]`;
    }
    
    await this.page.fill(selector, text);
  } catch (error) {
    throw new Error(`Failed to enter text in ${fieldName} field: ${error}`);
  }
});

When('I leave the {string} field empty', async function (fieldName: string) {
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
        selector = `[data-test="${fieldName.toLowerCase()}"]`;
    }
    
    await this.page.fill(selector, '');
  } catch (error) {
    throw new Error(`Failed to clear ${fieldName} field: ${error}`);
  }
});

When('I click the {string} button', async function (buttonName: string) {
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
        selector = `[data-test="${buttonName.toLowerCase()}-button"]`;
    }
    
    await this.page.click(selector);
    await this.page.waitForTimeout(2000);
  } catch (error) {
    throw new Error(`Failed to click ${buttonName} button: ${error}`);
  }
});

Then('I should be redirected to the products page', async function () {
  try {
    await this.page.waitForURL('**/inventory.html', { timeout: 10000 });
    const currentUrl = this.page.url();
    expect(currentUrl).toContain('inventory');
  } catch (error) {
    throw new Error(`Failed to redirect to products page: ${error}`);
  }
});

Then('I should see the inventory list', async function () {
  try {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
    const inventoryList = this.page.locator('.inventory_list');
    await expect(inventoryList).toBeVisible();
  } catch (error) {
    throw new Error(`Failed to see inventory list: ${error}`);
  }
});

Then('I should be logged in successfully', async function () {
  try {
    await Promise.race([
      this.page.waitForURL('**/inventory.html', { timeout: 8000 }),
      this.page.waitForSelector('.inventory_list', { timeout: 8000 })
    ]);
    
    const currentUrl = this.page.url();
    const hasInventory = await this.page.locator('.inventory_list').isVisible();
    expect(currentUrl.includes('inventory') || hasInventory).toBeTruthy();
  } catch (error) {
    throw new Error(`Login was not successful: ${error}`);
  }
});

Then('I should see an error message', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    await expect(errorElement).toBeVisible();
  } catch (error) {
    throw new Error(`Expected error message not found: ${error}`);
  }
});

Then('I should see a locked out error message', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('locked out');
  } catch (error) {
    throw new Error(`Locked out error message not found: ${error}`);
  }
});

Then('I should see validation error messages', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    const errorText = await errorElement.textContent();
    expect(errorText).toMatch(/(required|Username|Password)/i);
  } catch (error) {
    throw new Error(`Validation error messages not found: ${error}`);
  }
});

Then('I should remain on the login page', async function () {
  try {
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('inventory');
    
    const loginButton = this.page.locator('[data-test="login-button"]');
    await expect(loginButton).toBeVisible();
  } catch (error) {
    throw new Error(`Not on login page as expected: ${error}`);
  }
});

Then('I may experience visual glitches on the products page', async function () {
  try {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
    // Visual glitches are UI-specific - just verify we reached the page
  } catch (error) {
    throw new Error(`Failed to reach products page: ${error}`);
  }
});

Then('the page load may be slower than normal', async function () {
  try {
    // Extended timeout for performance_glitch_user
    await this.page.waitForSelector('.inventory_list', { timeout: 15000 });
  } catch (error) {
    throw new Error(`Page did not load even with extended timeout: ${error}`);
  }
});

Then('the login button should remain disabled or show error', async function () {
  try {
    // Check for error message (SauceDemo's validation approach)
    const hasError = await this.page.locator('[data-test="error"]').isVisible();
    expect(hasError).toBeTruthy();
  } catch (error) {
    throw new Error(`Expected validation error not found: ${error}`);
  }
});

Then('the system should respond appropriately', async function () {
  try {
    await this.page.waitForTimeout(1000);
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('error');
  } catch (error) {
    throw new Error(`System did not respond appropriately: ${error}`);
  }
});