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

console.log('Starting Feature & Step Definition Generation...');

function enforceDeclarativeSteps(content: string): string {
  let transformed = content
    // Standardize quote usage
    .replace(/When I click on the '([^']+)'/gi, 'When I click on the "$1"')
    .replace(/Then I should see a '([^']+)'/gi, 'Then I should see a "$1"')
    .replace(/And I click on the '([^']+)'/gi, 'And I click on the "$1"')

    // Declarative language corrections
    .replace(/When I go to the "(.*?)" page/gi, 'Given the "$1" page is displayed')
    .replace(/And I fill in the "(.*?)" with "(.*?)"/gi, 'When the user provides "$2" for "$1"')
    .replace(/And I click on the "(.*?)" button/gi, 'When the user submits the "$1" action')
    .replace(/Then I should see a confirmation message "(.*?)"/gi, 'Then a confirmation message "$1" should be displayed')
    .replace(/Then I should see an error message "(.*?)"/gi, 'Then an error message "$1" should be displayed')

    // Parameter consistency
    .replace(/When I enter a keyword in the search bar/gi, 'When I enter "nature" in the search bar')
    .replace(/Then I should see a list of images related to the keyword/gi, 'Then I should see images related to "nature"')

    // Replace background-duplicated Givens in scenarios
    .replace(/(Background:[\s\S]+?)((?:\n\s*Scenario:[\s\S]+?)(?=\n\s*Scenario:|\n*$))/g, (_, background, scenarios) => {
      return background + scenarios.replace(/^\s*Given\s+/gm, 'When ');
    })

    .replace(/(Background:[\s\S]*?Scenario:[^\n]*\n[\s\S]*?)(\s*)Given I am on the ([^n]+) page/gm,
      '$1$2When I navigate to the $3 page')

    // Clarify incomplete descriptions
    .replace(/Given I am viewing an image in the featured gallery/gi, 'Given I am viewing the first image in the featured gallery')

    // Confirmation message improvement
    .replace(/And I should see a confirmation message of the successful addition/gi, 'Then a confirmation message "Image saved successfully" should be displayed');

  // 🧠 Rule enforcement: Warn on multiple When→Then chains
  const scenarioRegex = /(Scenario:.*?)(?=\nScenario:|\n*$)/gs;
  let match: RegExpExecArray | null;
  while ((match = scenarioRegex.exec(transformed)) !== null) {
    const block = match[1];
    const whenCount = (block.match(/^\s*When\b/gm) || []).length;
    const thenCount = (block.match(/^\s*Then\b/gm) || []).length;

    if (whenCount > 1 && thenCount > 1) {
      console.warn(`⚠️ Detected multiple When→Then pairs in:\n  → ${block.split('\n')[0]}`);
    }
  }

  return transformed;
}

async function generateGherkinPrompt(featureTitle: string, userStory: string, scenarioCount: number): Promise<string> {
  const tag = `@${featureTitle.replace(/\s+(.)/g, (_: string, char: string) => char.toUpperCase()).replace(/^./, (str: string) => str.toLowerCase())}`;

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

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message?.content || '';
      let cleaned = content.replace(/```gherkin|```/g, '').trim();

      // 🧹 Remove any leading explanation before @tag or Feature:
      cleaned = cleaned.replace(/^.*?(?=@|Feature:)/s, '');

      // 🧼 Remove ALL instances of the tag first
      const tagPattern = new RegExp(`^\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gm');
      cleaned = cleaned.replace(tagPattern, '');

      // 🎯 Add the tag exactly once at the beginning
      cleaned = cleaned.replace(/^\s*Feature:/m, 'Feature:');
      cleaned = `${tag}\n${cleaned}`;

      // 🚫 Remove trailing explanation/commentary
      const explanationIndex = cleaned.search(/\bThis feature file\b|\bAll steps are\b|\bIn this feature\b/i);
      if (explanationIndex !== -1) {
        cleaned = cleaned.slice(0, explanationIndex).trim();
      }

      // 🔧 Fix first step in each Scenario (And -> Given)
      cleaned = cleaned.replace(/(Scenario:.*?\n)(\s*)And\b/g, '$1$2Given');

      // ✅ Enforce declarative style
      return enforceDeclarativeSteps(cleaned);
    } else {
      console.error('No content received from OpenAI API.');
      throw new Error('No content received from OpenAI API.');
    }
  } catch (error) {
    console.error('Error generating Gherkin content:', error);
    throw new Error('Failed to generate Gherkin content.');
  }
}

function improveStepDefinitions(content: string): string {
  // Ensure proper imports are at the top
  if (!content.includes('import { expect } from \'@playwright/test\'')) {
    content = 'import { Given, When, Then } from \'@cucumber/cucumber\';\nimport { expect } from \'@playwright/test\';\n\n' + content;
  }

  // Fix common issues
  content = content
    // Ensure proper timeout format
    .replace(/waitForSelector\('([^']+)'(?!, \{ timeout)/g, 'waitForSelector(\'$1\', { timeout: 15000 }')
    // Add networkidle after navigation
    .replace(/(await this\.page\.goto\([^)]+\);)/g, '$1\n  await this.page.waitForLoadState("networkidle");')
    // Fix incomplete assertions
    .replace(/\/\/ Assuming.*?$/gm, '// TODO: Implement specific verification logic');

  return finalCleanup(content);
}

function finalCleanup(content: string): string {
  return content
    // Remove duplicate waitForLoadState calls
    .replace(/await this\.page\.waitForLoadState\([^)]+\);\s*await this\.page\.waitForLoadState\([^)]+\);/g,
      'await this.page.waitForLoadState("networkidle");')
    // Fix incomplete login comments
    .replace(/\/\/ handle login flow/g,
      'await this.page.click(loginButton);\n      // TODO: Add username/password input logic')
    // Fix error handling - use throw new Error instead of console.error
    .replace(/console\.error\(`([^`]+): \$\{error\}`\);/g,
      'throw new Error(`$1: ${error}`);');
}

async function generateStepDefinitions(gherkinContent: string): Promise<string> {
  const selectorExamples = `Playwright Best Practices for Common Elements:
- Multiple selector strategy: 'button:has-text("Save"), button[title*="Save"], [data-testid="save-btn"]'
- Search inputs: 'input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]'
- Image galleries: 'figure img, [data-testid*="photo"], img[alt*="photo"]'
- Login detection: 'button:has-text("Log out"), [data-testid="user-menu"], .user-avatar'
- Navigation elements: 'nav a:has-text("Featured"), [role="tab"]:has-text("Featured")'
- Loading states: '.loading, [data-testid="loading"], .spinner'
- Error messages: '.error, [role="alert"], [data-testid="error"]'`;

  const prompt = `Convert the following Gherkin scenarios into TypeScript Cucumber step definitions using Playwright.

CRITICAL REQUIREMENTS:
1. Import: import { Given, When, Then } from '@cucumber/cucumber'; import { expect } from '@playwright/test';
2. Use multiple selector strategies with fallbacks: 'button:has-text("Save"), button[title*="Save"]'
3. Always wrap interactions in try-catch blocks for error handling
4. Use 'await this.page.waitForLoadState("networkidle")' after navigation
5. Timeout should be 15000ms for all waitForSelector calls
6. For login: check if already logged in first, then handle login flow if needed
7. Use Playwright's expect for assertions, not chai
8. Include meaningful verification for Then steps (no placeholder comments)
9. Steps must be written using Playwright's Page object via 'this.page'
10. For text verification, use locator-based assertions like: expect(this.page.locator('selector')).toBeVisible()

TEMPLATE STRUCTURE:
- Start with proper imports
- Each step should have error handling
- Use descriptive variable names
- Include both positive and negative assertions where appropriate
- For save/download actions, verify the action completed successfully

AVOID:
- Hard-coded selectors without fallbacks
- Missing error handling
- Incomplete placeholder comments
- Using chai assertions
- Assuming elements exist without proper waits

Gherkin Scenarios:
${gherkinContent}

Generate complete, production-ready TypeScript step definitions with proper error handling and assertions.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `${selectorExamples}\n\n${prompt}`
      }],
      temperature: 0.1, // Lower temperature for more consistent code generation
      max_tokens: 3000, // Increased for more comprehensive output
    });

    let stepDefinitions = (response.choices?.[0]?.message?.content || '')
      .replace(/```typescript|```/g, '')
      .replace(/Below are the.*?definitions.*?\n/gs, '')
      .replace(/###.*?\n/gs, '')
      .trim();

    // Post-processing to ensure quality
    stepDefinitions = improveStepDefinitions(stepDefinitions);

    return stepDefinitions;
  } catch (error) {
    console.error('Error generating step definitions:', error);
    throw new Error('Failed to generate step definitions.');
  }
}

async function promptForFeatureAndGenerate() {
  try {
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

    await generateFeatureFiles(answers.featureTitle, answers.userStory, parseInt(answers.scenarioCount, 10));
  } catch (error) {
    console.error('Error in script:', error);
  }
}

function validateStepCoverage(gherkinContent: string, stepDefinitions: string): void {
  // Extract all step text from Gherkin (excluding Background)
  const stepRegex = /^\s*(Given|When|Then|And|But)\s+(.+)$/gm;
  const gherkinSteps: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = stepRegex.exec(gherkinContent)) !== null) {
    const stepText = match[2].trim();
    // Skip background steps and normalize step text
    if (!stepText.includes('I am on') && !stepText.includes('I am logged')) {
      gherkinSteps.push(stepText);
    }
  }

  // Extract step definitions from generated code
  const stepDefRegex = /(Given|When|Then)\('([^']+)'/g;
  const generatedSteps: string[] = [];

  while ((match = stepDefRegex.exec(stepDefinitions)) !== null) {
    generatedSteps.push(match[2]);
  }

  // Find missing steps
  const missingSteps: string[] = gherkinSteps.filter(gherkinStep => {
    return !generatedSteps.some(genStep =>
      gherkinStep.toLowerCase().includes(genStep.toLowerCase()) ||
      genStep.toLowerCase().includes(gherkinStep.toLowerCase())
    );
  });

  if (missingSteps.length > 0) {
    console.warn('⚠️  Missing step definitions for:');
    missingSteps.forEach(step => console.warn(`   - ${step}`));
    console.warn('You may need to add these manually or regenerate.');
  } else {
    console.log('✅ All steps have corresponding step definitions');
  }
}

async function generateFeatureFiles(featureTitle: string, userStory: string, scenarioCount: number) {
  console.log('Requesting OpenAI for feature generation...');
  const rawGherkinContent = await generateGherkinPrompt(featureTitle, userStory, scenarioCount);

  // Apply declarative step improvements to the content before saving
  const cleanedGherkinContent = enforceDeclarativeSteps(rawGherkinContent);

  const featureFilePath = path.join(FEATURES_DIR, `${featureTitle.replace(/\s+/g, '')}.feature`);
  await ensureDir(FEATURES_DIR);
  await writeFile(featureFilePath, cleanedGherkinContent, 'utf8');
  console.log(`Feature file saved: ${featureFilePath}`);

  const actualScenarioCount = (cleanedGherkinContent.match(/^ *Scenario:/gm) || []).length;
  if (actualScenarioCount !== scenarioCount) {
    console.warn(`Expected ${scenarioCount} scenarios, but found ${actualScenarioCount}.`);
  }

  console.log('Generating TypeScript step definitions...');
  // Use the cleaned Gherkin content for step generation
  const stepDefinitions = await generateStepDefinitions(cleanedGherkinContent);

  // Validate step coverage using the cleaned content
  validateStepCoverage(cleanedGherkinContent, stepDefinitions);

  const stepFilePath = path.join(STEPS_DIR, `${featureTitle.replace(/\s+/g, '').toLowerCase()}.steps.ts`);
  await ensureDir(STEPS_DIR);
  await writeFile(stepFilePath, stepDefinitions, 'utf8');
  console.log(`Step definitions saved: ${stepFilePath}`);
}

promptForFeatureAndGenerate();