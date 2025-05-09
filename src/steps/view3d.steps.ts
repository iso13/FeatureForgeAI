import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world.js';

Given('the user opens the model viewer page', async function (this: CustomWorld) {
  await this.page!.goto('https://modelviewer.dev/examples/augmentedreality/');
});

When('the 3D model should be visible', async function (this: CustomWorld) {
  // Use the uniquely identified model-viewer by ID
  await expect(this.page!.locator('#model-viewer')).toBeVisible();
});

Then('the user interacts with the 3D model', async function (this: CustomWorld) {
  const viewer = this.page!.locator('#model-viewer');
  await viewer.scrollIntoViewIfNeeded();
  await viewer.hover();

  const box = await viewer.boundingBox();
  if (box) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // First drag (halfway)
    await this.page!.mouse.move(centerX, centerY);
    await this.page!.mouse.down();
    await this.page!.mouse.move(centerX + 300, centerY, { steps: 30 });
    await this.page!.mouse.up();

    // Second drag (continue rotation)
    await this.page!.mouse.move(centerX, centerY);
    await this.page!.mouse.down();
    await this.page!.mouse.move(centerX + 300, centerY, { steps: 30 });
    await this.page!.mouse.up();

    console.log('🔁 Simulated two-pass horizontal drag for full 360° rotation');
  } else {
    console.warn('⚠️ Could not retrieve bounding box for model-viewer.');
  }
});
