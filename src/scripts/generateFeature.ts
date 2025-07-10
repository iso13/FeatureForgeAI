/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fsExtra from 'fs-extra';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

const { writeFile, ensureDir } = fsExtra;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const STEPS_DIR = path.resolve(__dirname, '../../src/steps');

async function generateStepDefinitions(gherkinContent: string): Promise<string> {
  const prompt = `Generate TypeScript step definitions from the following Gherkin feature using Cucumber and Playwright.

REQUIREMENTS:
- Use: import { Given, When, Then } from '@cucumber/cucumber';
- Use: import { expect } from '@playwright/test';
- Use: import type { CustomWorld } from '../support/world';
- Each step function must be declared with (this: CustomWorld)
- Use 'this.page' for all Playwright actions
- Use try/catch blocks around every step
- Wait for navigation using: await this.page.waitForLoadState('networkidle')
- Use data-testid attributes for selectors (e.g., [data-testid="username-input"])
- For When steps, explicitly include fill and click actions for forms
- For Then steps, use: expect(await element?.isVisible()).toBe(true) — do not use toBeTruthy()
- Do NOT include any markdown (no \`\`\`), headings, or commentary
- Only output valid TypeScript step definitions

Gherkin Feature:
${gherkinContent}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const raw = response.choices?.[0]?.message?.content;
  return typeof raw === 'string'
    ? raw.replace(/```typescript/g, '').replace(/```/g, '').trim()
    : '';
}

async function generateFeatureFile(featureTitle: string, userStory: string, scenarioCount: number) {
  const tag = `@${featureTitle.replace(/\s+/g, '').toLowerCase()}`;
  const prompt = `Generate a Cucumber BDD Gherkin feature file.

Requirements:
- Tag the feature with: ${tag}
- Title: ${featureTitle}
- User Story: ${userStory}
- Include exactly ${scenarioCount} scenarios
- Use a Background section for shared Given steps
- All steps must use declarative formatting (e.g., "When the user submits the action")
- Output only valid Gherkin, no explanations or markdown

Output the feature file now.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1500,
  });

  const raw = response.choices?.[0]?.message?.content;
  const cleaned = typeof raw === 'string'
    ? raw.replace(/```gherkin|```/g, '').replace(/^.*?(?=@|Feature:)/s, '').trim()
    : '';

  const alreadyTagged = cleaned.trim().startsWith(tag);
  const tagged = alreadyTagged ? cleaned.trim() : `${tag}\n${cleaned.trim()}`;
  const actualFeature = tagged.split('\n').filter(line => !line.startsWith('This') && !line.startsWith('All')).join('\n');

  return actualFeature;
}

async function promptForFeatureAndGenerate() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'featureTitle',
      message: 'Enter the feature title:',
      validate: (input: string) => input.trim() ? true : 'Feature title cannot be empty.',
    },
    {
      type: 'input',
      name: 'userStory',
      message: 'Enter the user story (e.g., "As a user, I want to log in so that I can access my account"):',
      validate: (input: string) => input.trim().startsWith('As ') ? true : 'User story must start with "As a...".',
    },
    {
      type: 'input',
      name: 'scenarioCount',
      message: 'Enter the number of scenarios (default 1, max 6):',
      default: '1',
      validate: (input: string) => {
        const num = parseInt(input, 10);
        return (num >= 1 && num <= 6) ? true : 'Please enter a number between 1 and 6.';
      }
    }
  ]);

  const { featureTitle, userStory, scenarioCount } = answers;
  console.log('Generating feature file...');
  const gherkinContent = await generateFeatureFile(featureTitle, userStory, parseInt(scenarioCount));

  const featureFilePath = path.join(FEATURES_DIR, `${featureTitle.replace(/\s+/g, '')}.feature`);
  await ensureDir(FEATURES_DIR);
  await writeFile(featureFilePath, gherkinContent, 'utf8');
  console.log(`Feature file saved: ${featureFilePath}`);

  console.log('Generating step definitions...');
  const stepDefs = await generateStepDefinitions(gherkinContent);
  const stepFilePath = path.join(STEPS_DIR, `${featureTitle.replace(/\s+/g, '').toLowerCase()}.steps.ts`);
  await ensureDir(STEPS_DIR);
  await writeFile(stepFilePath, stepDefs, 'utf8');
  console.log(`Step definitions saved: ${stepFilePath}`);
}

promptForFeatureAndGenerate();