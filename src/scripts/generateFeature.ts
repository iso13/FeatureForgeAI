import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { writeFile, ensureDir } from 'fs-extra';
import inquirer from 'inquirer';

// Load environment variables from the .env file
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const STEPS_DIR = path.resolve(__dirname, '../../src/steps');

console.log('Starting Feature & Step Definition Generation...');

// Function to Enforce Declarative Steps
function enforceDeclarativeSteps(content: string): string {
    return content
        .replace(/When I go to the "(.*?)" page/gi, 'Given the "$1" page is displayed')
        .replace(/And I fill in the "(.*?)" with "(.*?)"/gi, 'When the user provides "$2" for "$1"')
        .replace(/And I click on the "(.*?)" button/gi, 'When the user submits the "$1" action')
        .replace(/Then I should see a confirmation message "(.*?)"/gi, 'Then a confirmation message "$1" should be displayed')
        .replace(/Then I should see an error message "(.*?)"/gi, 'Then an error message "$1" should be displayed');
}

// Function to Generate AI-Generated Gherkin with Tag and Background
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

        let content = response.choices[0]?.message?.content || '';
        return enforceDeclarativeSteps(content.replace(/```gherkin|```/g, '').trim());
    } catch (error) {
        console.error('Error generating Gherkin content:', error);
        throw new Error('Failed to generate Gherkin content.');
    }
}

// Function to Generate AI-Generated Step Definitions
async function generateStepDefinitions(gherkinContent: string): Promise<string> {
    const prompt = `Convert the following Gherkin scenarios into TypeScript Cucumber step definitions using Playwright.
Ensure:
1. Only valid TypeScript code.
2. No explanations, comments, or extra text.
3. Use 'this.page' for Playwright interactions.
4. Maintain declarative step structure.

Gherkin Scenarios:
${gherkinContent}

Output TypeScript code only.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 2000
        });

        return cleanStepDefinitions(response.choices[0]?.message?.content || '');
    } catch (error) {
        console.error('Error generating step definitions:', error);
        throw new Error('Failed to generate step definitions.');
    }
}

// Function to Clean Step Definitions Output
function cleanStepDefinitions(content: string): string {
    return content.replace(/.*Below are the TypeScript Cucumber step definitions.*|### Explanation:.*|### Notes:.*|```typescript|```/gs, '').trim();
}

// Function to Prompt for Feature Title, Story, and Scenario Count
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

// Function to Generate Feature & Step Definitions
async function generateFeatureFiles(featureTitle: string, userStory: string, scenarioCount: number) {
    console.log('Requesting OpenAI for feature generation...');

    let gherkinContent = await generateGherkinPrompt(featureTitle, userStory, scenarioCount);
    gherkinContent = enforceDeclarativeSteps(gherkinContent);

    const featureFilePath = path.join(FEATURES_DIR, `${featureTitle.replace(/\s+/g, '')}.feature`);
    await ensureDir(FEATURES_DIR);
    await writeFile(featureFilePath, gherkinContent, 'utf8');
    console.log(`Feature file saved: ${featureFilePath}`);

    // Optional: Warn if actual scenario count differs
    const actualScenarioCount = (gherkinContent.match(/^ *Scenario:/gm) || []).length;
    if (actualScenarioCount !== scenarioCount) {
        console.warn(`⚠️ Expected ${scenarioCount} scenarios, but found ${actualScenarioCount} in the generated feature.`);
    }

    console.log('Generating TypeScript step definitions...');
    let stepDefinitions = await generateStepDefinitions(gherkinContent);
    stepDefinitions = cleanStepDefinitions(stepDefinitions);

    const stepFilePath = path.join(STEPS_DIR, `${featureTitle.replace(/\s+/g, '').toLowerCase()}.steps.ts`);
    await ensureDir(STEPS_DIR);
    await writeFile(stepFilePath, stepDefinitions, 'utf8');
    console.log(`Step definitions saved: ${stepFilePath}`);
}

// Start Interactive Prompt
promptForFeatureAndGenerate();