/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { Given } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';
import { environments } from '../support/environments';

Given('I navigate to homepage', async function (this: CustomWorld) {
  const envKey = process.env.ENV as keyof typeof environments || 'qa';
  const baseURL = environments[envKey];
  await this.page?.goto(baseURL);
  await this.page?.waitForTimeout(5000);
});