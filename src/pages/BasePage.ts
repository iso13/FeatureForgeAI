import { Page, Locator } from 'playwright';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to a given URL.
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Waits for full page load (network idle).
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Checks if a locator is visible on the page.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Gets the current page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Captures a full-page screenshot to `reports/screenshots/`.
   * The `name` param should not include the `.png` extension.
   */
  async captureScreenshot(name: string): Promise<void> {
    const path = `reports/screenshots/${name}.png`;
    await this.page.screenshot({ path, fullPage: true });
    console.log(`🖼️ Screenshot captured: ${path}`);
  }

  /**
   * All subclasses must implement their default URL.
   */
  abstract getUrl(): string;
}