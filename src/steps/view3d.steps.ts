/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world.js';

Given('the user opens the model viewer page', async function (this: CustomWorld) {
  await this.page!.goto('https://modelviewer.dev/examples/augmentedreality/');
});

When('the 3D model should be visible', async function (this: CustomWorld) {
  // Use the uniquely identified model-viewer by ID
  await expect(this.page!.locator('#model-viewer')).toBeVisible();
});

Then('the user interacts with the 3D model', async function () {
  const allCanvases = await this.page.locator('canvas');
  const count = await allCanvases.count();
  const canvas = allCanvases.first();

  await canvas.waitFor({ state: 'visible', timeout: 5000 });

  const box = await canvas.boundingBox();
  if (!box || box.width === 0 || box.height === 0) {
    throw new Error('Could not get usable canvas bounding box');
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  console.log(`Targeting canvas center: (${centerX}, ${centerY})`);

  await this.page.waitForTimeout(1000);
  await this.page.mouse.move(centerX, centerY);
  await this.page.mouse.down();
  await this.page.mouse.move(centerX - 150, centerY, { steps: 40 });
  await this.page.waitForTimeout(200);
  await this.page.mouse.move(centerX + 150, centerY, { steps: 40 });
  await this.page.mouse.up();

  console.log('Performed two-pass horizontal drag inside visible canvas');
  await this.page.waitForTimeout(1000); // give time for animation to show up in video
});

