import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('I am logged in as an Admin', async function (this: CustomWorld) {
  try {
    await this.page.goto('http://localhost:3000/admin');
    await this.page.fill('[data-testid="username-input"]', 'admin');
    await this.page.fill('[data-testid="password-input"]', 'admin');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  } catch (error) {
    throw new Error(`Failed to login as Admin: ${error}`);
  }
});

When('I go to the Add User page', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="add-user-button"]');
    await this.page.waitForLoadState('networkidle');
  } catch (error) {
    throw new Error(`Failed to navigate to Add User page: ${error}`);
  }
});

When('I fill in the user details', async function (this: CustomWorld) {
  try {
    await this.page.fill('[data-testid="username-input"]', 'newuser');
    await this.page.fill('[data-testid="password-input"]', 'newpassword');
    await this.page.fill('[data-testid="email-input"]', 'newuser@example.com');
  } catch (error) {
    throw new Error(`Failed to fill in user details: ${error}`);
  }
});

When('I fill in the user details but leave some fields blank', async function (this: CustomWorld) {
  try {
    await this.page.fill('[data-testid="username-input"]', 'newuser');
    await this.page.fill('[data-testid="password-input"]', '');
    await this.page.fill('[data-testid="email-input"]', 'newuser@example.com');
  } catch (error) {
    throw new Error(`Failed to fill in user details with some fields left blank: ${error}`);
  }
});

When('I fill in the user details with invalid data', async function (this: CustomWorld) {
  try {
    await this.page.fill('[data-testid="username-input"]', 'newuser!');
    await this.page.fill('[data-testid="password-input"]', 'newpassword');
    await this.page.fill('[data-testid="email-input"]', 'invalidemail');
  } catch (error) {
    throw new Error(`Failed to fill in user details with invalid data: ${error}`);
  }
});

When('I fill in the user details with data that already exists in the system', async function (this: CustomWorld) {
  try {
    await this.page.fill('[data-testid="username-input"]', 'existinguser');
    await this.page.fill('[data-testid="password-input"]', 'existingpassword');
    await this.page.fill('[data-testid="email-input"]', 'existinguser@example.com');
  } catch (error) {
    throw new Error(`Failed to fill in user details with duplicate data: ${error}`);
  }
});

When('I submit the new user form', async function (this: CustomWorld) {
  try {
    await this.page.click('[data-testid="submit-button"]');
    await this.page.waitForLoadState('networkidle');
  } catch (error) {
    throw new Error(`Failed to submit new user form: ${error}`);
  }
});

Then('I should see a confirmation message', async function (this: CustomWorld) {
  try {
    const element = await this.page.$('[data-testid="confirmation-message"]');
    expect(await element?.isVisible()).toBe(true);
  } catch (error) {
    throw new Error(`Failed to see confirmation message: ${error}`);
  }
});

Then('I should see an error message', async function (this: CustomWorld) {
  try {
    const element = await this.page.$('[data-testid="error-message"]');
    expect(await element?.isVisible()).toBe(true);
  } catch (error) {
    throw new Error(`Failed to see error message: ${error}`);
  }
});

Then('the new user should be added to the system', async function (this: CustomWorld) {
  try {
    const element = await this.page.$(`[data-testid="user-newuser"]`);
    expect(await element?.isVisible()).toBe(true);
  } catch (error) {
    throw new Error(`Failed to verify new user is added: ${error}`);
  }
});

Then('the new user should not be added to the system', async function (this: CustomWorld) {
  try {
    const element = await this.page.$(`[data-testid="user-newuser"]`);
    expect(await element?.isVisible()).toBe(false);
  } catch (error) {
    throw new Error(`Failed to verify new user is not added: ${error}`);
  }
});