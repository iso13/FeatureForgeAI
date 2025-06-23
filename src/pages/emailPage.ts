import type { Page } from 'playwright';

export class EmailPage {
  constructor(private page: Page) {}

  async getLastEmail(email: string): Promise<string> {
    // Stubbed logic: in real scenario, fetch email from test inbox or mock server
    return `Click the link to reset your password: https://your-app-url.com/reset?token=abc123`;
  }

  getResetLink(emailContent: string): string {
    const match = emailContent.match(/https:\/\/[^\s]+/);
    return match?.[0] || '';
  }
}