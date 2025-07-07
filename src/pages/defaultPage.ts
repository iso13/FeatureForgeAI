/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

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