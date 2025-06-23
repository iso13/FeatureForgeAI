import type { Page } from 'playwright';

export class LoginPage {
  constructor(private page: Page) { }

  async goto(): Promise<void> {
    await this.page.goto('https://your-app-url.com/login');
  }

  async clickForgotPassword(): Promise<void> {
    await this.page.click('text=Forgot password');
  }

  async enterEmail(email: string): Promise<void> {
    await this.page.fill('input[type="email"]', email);
  }

  async clickResetPassword(): Promise<void> {
    await this.page.click('text=Reset password');
  }

  async enterNewPassword(password: string): Promise<void> {
    await this.page.fill('input[name="newPassword"]', password);
  }

  async confirmNewPassword(password: string): Promise<void> {
    await this.page.fill('input[name="confirmPassword"]', password);
  }

  async clickChangePassword(): Promise<void> {
    await this.page.click('text=Change password');
  }

  async getConfirmationMessage(): Promise<string> {
    const message = await this.page.textContent('.confirmation-message');
    if (!message) throw new Error('Confirmation message not found');
    return message;
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('text=Login');
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.page.isVisible('text=Welcome') || this.page.url().includes('/dashboard');
  }
}