import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

function generateRandomName(): string {
  const names = ['David', 'Sarah', 'John', 'Emily', 'Michael', 'Linda'];
  return names[Math.floor(Math.random() * names.length)];
}

function generateRandomUsername(): string {
  return `user${Math.floor(Math.random() * 100000)}`;
}

// cSpell:ignore testmail
function generateRandomEmail(): string {
  const domains = ['example.com', 'testmail.com', 'mailinator.com'];
  return `user${Date.now()}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

function generateRandomPassword(): string {
    const base = `Test@${Math.floor(100000 + Math.random() * 900000)}`; // adds 6 digits
    return base + 'A!'; // total length ≥ 12 and includes uppercase/special
  }

Given('I am on the join real page', async function (this: CustomWorld) {
  await this.page.goto('https://bolt.playrealbrokerage.com/register');
});

When('I create an account', async function (this: CustomWorld) {
  const firstName = generateRandomName();
  const lastName = generateRandomName();
  const username = generateRandomUsername();
  const email = generateRandomEmail();
  const password = generateRandomPassword();

  await this.page.getByTestId('firstName').fill(firstName);
  await this.page.getByTestId('lastName').fill(lastName);

  // Country dropdown selection (fixed: United States)
  await this.page.getByTestId('country').click();
  await this.page.getByRole('option', { name: 'United States' }).click();

  await this.page.getByTestId('username').fill(username);
  await this.page.getByTestId('emailAddress').fill(email);

  await this.page.getByTestId('password').fill(password);
  await this.page.getByTestId('confirmPassword').fill(password);

  await this.page.getByRole('checkbox', { name: 'terms' }).check();
  await this.page.getByRole('checkbox', { name: 'permission' }).check();

  const submitButton = this.page.getByRole('button', { name: /create account/i });
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  await this.page.waitForLoadState('networkidle');

  // Save for validation
  this.firstName = firstName;
  this.lastName = lastName;
  this.username = username;
  this.emailAddress = email;
});

Then('I should be on the Real page', async function (this: CustomWorld) {
  const greetingText = `Hi, ${this.firstName} ${this.lastName}`;
  await expect(this.page.locator(`text=${greetingText}`)).toBeVisible();
});