// src/pages/loginPage.ts
import { Page } from 'playwright';
import { BasePage } from './basePage';

export class LoginPage extends BasePage {
  readonly emailInput = this.page.locator('[data-testid="email-input"]');
  readonly passwordInput = this.page.locator('[data-testid="password-input"]');
  readonly loginButton = this.page.locator('[data-testid="login-button"]');

  constructor(page: Page) {
    super(page);
  }

  getUrl(): string {
    return `${process.env.FEATUREGEN_URL}/auth`;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.getUrl());
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}