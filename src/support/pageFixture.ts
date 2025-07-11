/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// src/support/pageFixture.ts
import type { Browser, BrowserContext, Page } from 'playwright';
import {chromium} from 'playwright';
class PageFixture {
  browser: Browser | undefined;
  context: BrowserContext | undefined;
  page: Page | undefined;

  // Method to initialize the browser, context, and page
  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: false });
    }

    if (!this.context) {
      this.context = await this.browser.newContext(); // Create a new context for each scenario
    }

    if (!this.page) {
      this.page = await this.context.newPage(); // Create a new page within the context
    }
  }

  // Method to close the browser and clean up references
  async close() {
    if (this.page) {
      await this.page.close(); // Close the page if it’s open
      this.page = undefined;
    }

    if (this.context) {
      await this.context.close(); // Close the context if it’s open
      this.context = undefined;
    }

    if (this.browser) {
      await this.browser.close(); // Close the browser if it’s open
      this.browser = undefined;
    }
  }
}

export const fixture = new PageFixture();
