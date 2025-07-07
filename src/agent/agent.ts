/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// src/agent/agent.ts
import { generateGherkinPrompt } from '../utils/gherkinPrompt';
import { enforceDeclarativeSteps } from '../utils/enforceDeclarative';
import { generateStepDefinitions } from '../utils/stepWriter';
import { writeFeatureFile, writeStepFile } from '../helpers/filewriter';
import path from 'path';

export async function generateFeatureFiles(title: string, story: string, scenarioCount: number) {
  const tag = `@${title.replace(/\s+/g, '').toLowerCase()}`;
  const raw = await generateGherkinPrompt(tag, title, story, scenarioCount);
  const gherkin = enforceDeclarativeSteps(raw);

  const featurePath = path.resolve('src/features', `${title.replace(/\s+/g, '')}.feature`);
  const stepsPath = path.resolve('src/steps', `${title.replace(/\s+/g, '').toLowerCase()}.steps.ts`);

  await writeFeatureFile(featurePath, gherkin);

  const steps = await generateStepDefinitions(gherkin);
  await writeStepFile(stepsPath, steps);

  console.log(`✅ Generated: ${featurePath}\n✅ Generated: ${stepsPath}`);
}