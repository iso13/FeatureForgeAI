/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// src/scripts/featureGenerator.ts
// It prompts the user for feature details, generates Gherkin content, and writes both the feature file using OpenAI
import OpenAI from 'openai';
import fsExtra from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { enforceDeclarativeSteps } from '../utils/enforceDeclarative';
import inquirer from 'inquirer';

dotenv.config();

const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const STEPS_DIR = path.resolve(__dirname, '../../src/steps');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateFeatureFiles(featureTitle: string, userStory: string, scenarioCount: number) {
  console.log('Requesting OpenAI for feature generation...');

  const tag = `@${featureTitle.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, str => str.toLowerCase())}`;
  const prompt = `Generate a Cucumber BDD feature file with the following details:

Feature Tag: "${tag}"
Feature Title: "${featureTitle}"
User Story: "${userStory}"
Number of Scenarios: ${scenarioCount}

Ensure:
1. The feature file starts with the tag "${tag}" directly above the Feature keyword.
2. A Background section is used for any Given steps that are common across all scenarios.
3. The file must include exactly ${scenarioCount} scenario(s).
4. Each scenario must be well-structured and meaningful.
5. Ensure all steps follow declarative formatting.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000
  });

  let content = response.choices?.[0]?.message?.content || '';
  content = content.replace(/```gherkin|```/g, '').trim();
  content = content.replace(/^.*?(?=@|Feature:)/s, '');

  const tagPattern = new RegExp(`^\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gm');
  content = content.replace(tagPattern, '');
  content = content.replace(/^\s*Feature:/m, 'Feature:');
  content = `${tag}\n${content}`;

  const explanationIndex = content.search(/\bThis feature file\b|\bAll steps are\b|\bIn this feature\b/i);
  if (explanationIndex !== -1) content = content.slice(0, explanationIndex).trim();

  const cleaned = enforceDeclarativeSteps(content);

  const featurePath = path.join(FEATURES_DIR, `${featureTitle.replace(/\s+/g, '')}.feature`);
  await fsExtra.ensureDir(FEATURES_DIR);
  await fsExtra.writeFile(featurePath, cleaned, 'utf8');
  console.log(`Feature file saved: ${featurePath}`);
}

async function runInteractivePrompt() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'featureTitle',
      message: 'Enter the feature title:',
      validate: input => input.trim() ? true : 'Feature title cannot be empty.',
    },
    {
      type: 'input',
      name: 'userStory',
      message: 'Enter the user story:',
      validate: input => input.trim().startsWith('As ') ? true : 'User story must start with "As a...".',
    },
    {
      type: 'input',
      name: 'scenarioCount',
      message: 'Enter the number of scenarios (1–6):',
      default: '1',
      validate: input => {
        const n = parseInt(input, 10);
        return (n >= 1 && n <= 6) ? true : 'Must be between 1 and 6.';
      }
    }
  ]);

  await generateFeatureFiles(answers.featureTitle, answers.userStory, parseInt(answers.scenarioCount, 10));
}

runInteractivePrompt();