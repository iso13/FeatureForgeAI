// scripts/generateFeatureFile.ts

import inquirer from 'inquirer';
import { mkdirp, writeFile } from 'fs-extra';
import path from 'path';
import {
  generateGherkinPrompt,
  generateStepDefsPrompt,
} from '../support/ai/aiHelper';

/** Strip ``` fences */
function stripCodeFences(content: string): string {
  const lines = content.split('\n');
  if (lines[0]?.trim().startsWith('```')) lines.shift();
  if (lines[lines.length - 1]?.trim().startsWith('```')) lines.pop();
  return lines.join('\n').trim();
}

/** Remove AI‑inserted leading @tags */
function stripLeadingTags(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim().startsWith('@')) i++;
  return lines.slice(i).join('\n').trim();
}

/**
 * Extract any common Given/And steps across all scenarios
 * and inject them as a Background.
 */
function extractBackground(content: string): string {
  const lines = content.split('\n');
  // find indices of each "Scenario:"
  const scenarioIdxs = lines
    .map((l, i) => (/^\s*Scenario:/.test(l) ? i : -1))
    .filter(i => i >= 0);

  if (scenarioIdxs.length < 2) {
    return content; // nothing to extract if <2 scenarios
  }

  // collect the leading Given/And block for each scenario
  const blocks = scenarioIdxs.map((start, idx) => {
    const end = scenarioIdxs[idx + 1] ?? lines.length;
    const block: string[] = [];
    for (let i = start + 1; i < end; i++) {
      const trimmed = lines[i].trim();
      if (/^(Given|And)\b/.test(trimmed)) {
        block.push(trimmed);
      } else if (/^(When|Then|Scenario:)/.test(trimmed)) {
        break;
      }
    }
    return block;
  });

  // find intersection of all blocks
  let common = blocks[0];
  for (const blk of blocks.slice(1)) {
    common = common.filter(step => blk.includes(step));
  }
  if (common.length === 0) {
    return content; // no common steps
  }

  // remove those steps from each scenario block
  const filteredLines: string[] = [];
  let inScenario = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*Scenario:/.test(l)) {
      inScenario = true;
      filteredLines.push(l);
      continue;
    }
    if (inScenario && common.includes(l.trim())) {
      // skip this common step
      continue;
    }
    if (inScenario && /^\s*(When|Then|Scenario:)/.test(l.trim())) {
      inScenario = false;
    }
    filteredLines.push(l);
  }

  // build the Background section
  const bgLines = ['Background:', ...common.map(s => `  ${s}`), ''];
  // find insertion point: after any feature tag(s) and the Feature: line
  let insertAt = filteredLines.findIndex(l => /^\s*Feature:/.test(l));
  if (insertAt === -1) insertAt = 0;
  insertAt += 1; // right after Feature:

  filteredLines.splice(insertAt, 0, '', ...bgLines);

  return filteredLines.join('\n');
}

async function promptForFeatureTitle(): Promise<string> {
  const { featureTitle } = await inquirer.prompt({
    type: 'input',
    name: 'featureTitle',
    message: 'Enter the feature title:',
  });
  return featureTitle.trim();
}

function toPascalCase(title: string): string {
  return title
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toLowerCamelCase(title: string): string {
  const pascal = toPascalCase(title);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function cleanScenarioTitles(content: string): string {
  return content.replace(/Scenario \d+: /g, 'Scenario: ');
}

function addFeatureTag(content: string, featureTitle: string): string {
  const tag = `@${toLowerCamelCase(featureTitle)}`;
  return `${tag}\n${content}`;
}

function limitScenarios(content: string, count: number): string {
  const regex = /Scenario:/g;
  const idxs: number[] = [];
  let m;
  while ((m = regex.exec(content)) !== null) idxs.push(m.index);
  if (idxs.length > count) {
    return content.substring(0, idxs[count]).trim();
  }
  return content;
}

async function promptForScenarioRange(): Promise<number> {
  const { scenarioCount } = await inquirer.prompt<{
    scenarioCount: number;
  }>({
    type: 'number',
    name: 'scenarioCount',
    message: 'Enter the number of scenarios to generate (3–10):',
    default: 5,
    validate: v =>
      typeof v === 'number' && v >= 3 && v <= 10
        ? true
        : 'Must be a number between 3 and 10',
  });
  return scenarioCount;
}

async function createFeatureAndSteps() {
  try {
    const featureTitle = await promptForFeatureTitle();
    const scenarioCount = await promptForScenarioRange();
    const pascalName = toPascalCase(featureTitle);

    // Generate feature
    const featurePath = path.resolve(
      __dirname,
      '../../src/features',
      `${pascalName}.feature`
    );
    await mkdirp(path.dirname(featurePath));

    const featurePrompt = `
Generate a Gherkin feature file titled "${featureTitle}" with exactly ${scenarioCount} scenarios.

Requirements:
- Always include a Background section with at least 2 realistic Given steps.
- Brief description under Feature.
- First scenario: happy path.
- Next ${scenarioCount - 2} scenarios: negative or edge.
- Last scenario: edge case.
- Include a Scenario Outline with Examples if relevant.
- Each scenario must have Given, When, Then.
- Do NOT number scenarios or steps.
`;

    console.log('📝 Generating feature…');
    let featureContent = await generateGherkinPrompt(featurePrompt);
    featureContent = stripCodeFences(featureContent);
    featureContent = stripLeadingTags(featureContent);
    featureContent = cleanScenarioTitles(featureContent);
    featureContent = extractBackground(featureContent);
    featureContent = addFeatureTag(featureContent, featureTitle);
    featureContent = limitScenarios(featureContent, scenarioCount);

    console.log('✅ Writing feature:', featurePath);
    await writeFile(featurePath, featureContent, 'utf8');

    // Generate step defs
    const stepsDir = path.resolve(__dirname, '../../src/steps');
    await mkdirp(stepsDir);
    const stepsPath = path.join(stepsDir, `${pascalName}.steps.ts`);

    const stepPrompt = `
You are given this Gherkin feature:
\`\`\`
${featureContent}
\`\`\`
Generate a Playwright + Cucumber step‑definition file in TypeScript:
- Use \`@cucumber/cucumber\`.
- Use \`fixture\` from '../support/pageFixture'.
- Use \`CustomWorld\` from '../support/world' for \`this.page\`.
- Attach screenshots on failure.
- Only output valid TypeScript code; no markdown fences.
`;

    console.log('📝 Generating step definitions…');
    let stepDefs = await generateStepDefsPrompt(stepPrompt);
    console.log('🛰️ Raw step‑defs:', stepDefs);
    if (!stepDefs.trim()) throw new Error('Empty step definitions from AI');

    stepDefs = stripCodeFences(stepDefs);
    console.log('✅ Writing steps:', stepsPath);
    await writeFile(stepsPath, stepDefs, 'utf8');

    console.log('🎉 Done!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createFeatureAndSteps();