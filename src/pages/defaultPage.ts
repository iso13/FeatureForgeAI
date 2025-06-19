// src/pages/defaultPage.ts
import { Page } from 'playwright';
import { BasePage } from './basePage';

export class DefaultPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getUrl(): string {
    return 'about:blank';
  }
}