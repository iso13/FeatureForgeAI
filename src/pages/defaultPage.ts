// src/pages/defaultPage.ts
import type { Page } from 'playwright';
import { BasePage } from './BasePage';

export class DefaultPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getUrl(): string {
    return 'about:blank';
  }
}