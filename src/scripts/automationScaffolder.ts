// src/scripts/automationScaffolder.ts
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const STEPS_DIR = path.resolve(__dirname, '../../src/steps');

const generator = IdGenerator.uuid();

function sanitizeStepText(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join('_')
    .toLowerCase();
}

function generateStepDefinition(stepText: string, keyword: string): string {
  const annotation = keyword.trim();
  return `
${annotation}('${stepText}', async function () {
  // TODO: implement step
});
`;
}

async function scaffoldMissingSteps() {
  const featurePaths = await glob(`${FEATURES_DIR}/**/*.feature`);
  const parser = new Parser(new AstBuilder(generator), new GherkinClassicTokenMatcher());

  for (const file of featurePaths) {
    const content = await fs.readFile(file, 'utf-8');
    const gherkinDocument = parser.parse(content);

    const feature = gherkinDocument.feature;
    if (!feature) continue;

    const featureSlug = feature.name.toLowerCase().replace(/\s+/g, '-');
    const stepDefsPath = path.resolve(STEPS_DIR, `${featureSlug}.steps.ts`);

    const existingCode = (await fs.pathExists(stepDefsPath))
      ? await fs.readFile(stepDefsPath, 'utf-8')
      : '';

    let newSteps = '';

    for (const scenario of feature.children) {
      if (!scenario || !scenario.scenario) continue;

      for (const step of scenario.scenario.steps) {
        const alreadyExists = existingCode.includes(step.text);
        if (!alreadyExists) {
          newSteps += generateStepDefinition(step.text, step.keyword);
        }
      }
    }

    if (newSteps.trim()) {
      const header = `
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';\n`;

      const combined = existingCode || header;
      await fs.writeFile(stepDefsPath, combined + '\n' + newSteps);
      console.log(`Updated ${path.basename(stepDefsPath)} with new step definitions.`);
    }
  }
}

scaffoldMissingSteps().catch((err) => {
  console.error('Failed to scaffold steps:', err);
});