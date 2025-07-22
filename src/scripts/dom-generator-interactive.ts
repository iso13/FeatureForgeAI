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
- Each step function must be declared with (this: CustomWorld, ...args)
- Use 'this.page' for all Playwright actions and selectors
- Normalize selectors using [data-testid] with interpolated variables
- Replace quoted values with {string} placeholders and use the corresponding argument

NORMALIZATION RULES:
- Normalize all field entry steps to: When I enter {string} into the {string} field
- Normalize button interactions to: When I click the {string} button
- Normalize document selections to: When I select the {string} document from my device
- All confirmation or error validations should be: Then I should see a {string} message
- Avoid imperative phrasing like "I fill", "I click", "I type"
- Ensure all steps are declarative and DRY

BEST PRACTICES:
- Use try/catch in each step
- Use Playwright methods: this.page.goto, this.page.fill, this.page.click, etc.
- Always use await this.page.waitForLoadState('networkidle') after navigation
- Use expect().toContain or expect().toBeTruthy for validations

DO NOT include markdown syntax, comments, or explanations. Return valid TypeScript only.

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

async function generateFeatureFile(featureTitle: string, userStory: string, scenarioCount: number): Promise<string> {
  const tag = `@${featureTitle.replace(/\s+/g, '').toLowerCase()}`;
  const prompt = `Generate a declarative Gherkin feature file using BDD best practices.

REQUIREMENTS:
- Tag the feature with: ${tag}
- Feature title: ${featureTitle}
- Include the user story on the line after the Feature title: "${userStory}"
- Use a Background section with any shared setup steps
- Create ${scenarioCount} high-quality scenarios
- Use Scenario Outline only when variations are significant and benefit from tabular clarity
- Use consistent declarative phrasing throughout
- Avoid imperative step wording (e.g., "click", "type", "fill")

Only return valid Gherkin. Do not include comments or explanation.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const raw = response.choices?.[0]?.message?.content;
  const cleaned = typeof raw === 'string'
    ? raw.replace(/```gherkin|```/g, '').replace(/^.*?(?=@|Feature:)/s, '').trim()
    : '';

  const alreadyTagged = cleaned.trim().startsWith(tag);
  const tagged = alreadyTagged ? cleaned.trim() : `${tag}\n${cleaned.trim()}`;
  return tagged.split('\n').filter(line => !line.startsWith('This') && !line.startsWith('All')).join('\n');
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
  console.log('Generating declarative feature and steps...');

  const gherkinPromise = generateFeatureFile(featureTitle, userStory, parseInt(scenarioCount));
  const stepDefsPromise = gherkinPromise.then(generateStepDefinitions);

  const [gherkinContent, stepDefs] = await Promise.all([gherkinPromise, stepDefsPromise]);

  const featureFilePath = path.join(FEATURES_DIR, `${featureTitle.replace(/\s+/g, '')}.feature`);
  const stepFilePath = path.join(STEPS_DIR, `${featureTitle.replace(/\s+/g, '').toLowerCase()}.steps.ts`);

  await Promise.all([
    ensureDir(FEATURES_DIR),
    ensureDir(STEPS_DIR),
  ]);

  await Promise.all([
    writeFile(featureFilePath, gherkinContent, 'utf8'),
    writeFile(stepFilePath, stepDefs, 'utf8'),
  ]);

  console.log(`Feature file saved: ${featureFilePath}`);
  console.log(`Step definitions saved: ${stepFilePath}`);
}

promptForFeatureAndGenerate();
