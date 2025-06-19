/* eslint-disable */
// src/scripts/dom-generator-interactive.ts
import inquirer from 'inquirer';
import { generateStepsFromDOM } from './dom-generator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);  // ← This line is crucial!

interface GeneratorOptions {
  url: string;
  featureName: string;
  outputDir: string;
  maxElements: number;
  includeAssertions: boolean;
  includeDataTestIds: boolean;
  preferAriaLabels: boolean;
  testAfterGeneration: boolean;
}

const commonUrls = [
  'https://playwright.dev',
  'https://example.com',
  'https://httpbin.org/forms/post',
  'https://the-internet.herokuapp.com/login',
  'https://demo.applitools.com',
  'Custom URL'
];

const featureTemplates = [
  { name: 'Login Feature', value: 'Login Feature' },
  { name: 'Registration Feature', value: 'Registration Feature' },
  { name: 'Dashboard Feature', value: 'Dashboard Feature' },
  { name: 'Checkout Feature', value: 'Checkout Feature' },
  { name: 'Search Feature', value: 'Search Feature' },
  { name: 'Profile Feature', value: 'Profile Feature' },
  { name: 'Custom Feature', value: 'custom' }
];

async function promptForOptions(): Promise<GeneratorOptions> {
  console.log('🤖 Welcome to the Interactive DOM Generator!');
  console.log('This tool will help you generate Cucumber features from web pages.\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'urlChoice',
      message: 'Choose a URL to analyze:',
      choices: commonUrls,
      default: 'https://playwright.dev'
    },
    {
      type: 'input',
      name: 'customUrl',
      message: 'Enter your custom URL:',
      when: (answers) => answers.urlChoice === 'Custom URL',
      validate: (input: string) => {
        if (!input.match(/^https?:\/\//)) {
          return 'Please enter a valid URL starting with http:// or https://';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'featureTemplate',
      message: 'Choose a feature template:',
      choices: featureTemplates,
      default: 'Login Feature'
    },
    {
      type: 'input',
      name: 'customFeatureName',
      message: 'Enter your custom feature name:',
      when: (answers) => answers.featureTemplate === 'custom',
      validate: (input: string) => input.trim() ? true : 'Feature name cannot be empty'
    },
    {
      type: 'list',
      name: 'complexity',
      message: 'Choose generation complexity:',
      choices: [
        { name: 'Simple (5 elements max, basic assertions)', value: 'simple' },
        { name: 'Standard (10 elements max, with assertions)', value: 'standard' },
        { name: 'Comprehensive (20 elements max, all features)', value: 'comprehensive' }
      ],
      default: 'standard'
    },
    {
      type: 'confirm',
      name: 'includeAssertions',
      message: 'Include assertion steps?',
      default: true
    },
    {
      type: 'confirm',
      name: 'preferAriaLabels',
      message: 'Prefer accessibility-friendly selectors (aria-labels, roles)?',
      default: true
    },
    {
      type: 'confirm',
      name: 'includeDataTestIds',
      message: 'Prioritize data-testid attributes?',
      default: true
    },
    {
      type: 'list',
      name: 'outputLocation',
      message: 'Where should the generated files be saved?',
      choices: [
        { name: 'Standard location (src/features)', value: './src/features' },
        { name: 'Generated folder (src/features/generated)', value: './src/features/generated' },
        { name: 'Temporary folder (src/features/temp)', value: './src/features/temp' }
      ],
      default: './src/features/generated'
    },
    {
      type: 'confirm',
      name: 'testAfterGeneration',
      message: 'Run the generated tests immediately after creation?',
      default: false
    }
  ]);

  // Determine final values
  const url = answers.urlChoice === 'Custom URL' ? answers.customUrl : answers.urlChoice;
  const featureName = answers.featureTemplate === 'custom' ? answers.customFeatureName : answers.featureTemplate;
  
  let maxElements = 10;
  if (answers.complexity === 'simple') maxElements = 5;
  if (answers.complexity === 'comprehensive') maxElements = 20;

  return {
    url,
    featureName,
    outputDir: answers.outputLocation,
    maxElements,
    includeAssertions: answers.includeAssertions,
    includeDataTestIds: answers.includeDataTestIds,
    preferAriaLabels: answers.preferAriaLabels,
    testAfterGeneration: answers.testAfterGeneration
  };
}

async function confirmGeneration(options: GeneratorOptions): Promise<boolean> {
  console.log('\n📋 Generation Summary:');
  console.log(`URL: ${options.url}`);
  console.log(`Feature Name: ${options.featureName}`);
  console.log(`Output Directory: ${options.outputDir}`);
  console.log(`Max Elements: ${options.maxElements}`);
  console.log(`Include Assertions: ${options.includeAssertions ? '✅' : '❌'}`);
  console.log(`Prefer Aria Labels: ${options.preferAriaLabels ? '✅' : '❌'}`);
  console.log(`Include Data-TestIds: ${options.includeDataTestIds ? '✅' : '❌'}`);
  console.log(`Test After Generation: ${options.testAfterGeneration ? '✅' : '❌'}`);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '\nProceed with generation?',
      default: true
    }
  ]);

  return confirm;
}

async function runTests(featureName: string): Promise<void> {
  console.log('\n🧪 Running generated tests...');
  
  try {
    // Use spawn instead of execAsync for better compatibility
    const { spawn } = await import('child_process');
    
    const child = spawn('npm', ['run', 'cucumber', '--', '--tags', '"@generated"'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Tests completed successfully!');
      } else {
        console.log('\n⚠️  Tests completed with issues.');
      }
    });
    
  } catch (error) {
    console.log('\n⚠️  Could not run tests. You can run them manually with: npm run cucumber:generated');
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

async function openReports(): Promise<void> {
 const { openReports } = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'openReports',
    message: 'Open test reports in browser?',
    default: true
  }
]);

if (openReports) {
    try {
      await execAsync('npm run report:open');
    } catch (error) {
      console.log('Could not open reports automatically. Run "npm run report:open" manually.');
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  }
}

async function showNextSteps(result: { featurePath: string; stepDefsPath: string; stepsCount: number }): Promise<void> {
  console.log('\n✨ Next steps:');
  console.log('1. Review and customize the generated feature file');
  console.log('2. Update step definitions as needed');
  console.log('3. Run tests: npm run cucumber:generated');
  console.log('4. View reports: npm run report:open');
  console.log('\n📁 Generated Files:');
  console.log(`   Feature: ${result.featurePath}`);
  console.log(`   Steps: ${result.stepDefsPath}`);
  console.log(`   Steps Count: ${result.stepsCount}`);

  const { viewFiles } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'viewFiles',
      message: 'Would you like to see the generated feature file content?',
      default: false
    }
  ]);

  if (viewFiles) {
    try {
      const fs = await import('fs');
      const featureContent = fs.readFileSync(result.featurePath, 'utf-8');
      console.log('\n📄 Generated Feature File:');
      console.log('═'.repeat(50));
      console.log(featureContent);
      console.log('═'.repeat(50));
    } catch (error) {
      console.error('Could not read feature file:', error);
    }
  }
}

async function handleError(error: unknown): Promise<void> {
  console.error('\n❌ Generation failed:');
  
  if (error instanceof Error) {
    console.error('Error:', error.message);
    
    // Provide helpful suggestions based on common errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('net::ERR')) {
      console.log('\n💡 Suggestion: Check if the URL is accessible and your internet connection is working.');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Suggestion: The page might be taking too long to load. Try a different URL or increase timeout.');
    } else if (error.message.includes('ENOENT') || error.message.includes('permission')) {
      console.log('\n💡 Suggestion: Check file permissions and ensure the output directory is writable.');
    }
  } else {
    console.error('Unknown error:', error);
  }
  
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Ensure you have internet connectivity');
  console.log('2. Try with a simpler URL like https://example.com');
  console.log('3. Check that Playwright browsers are installed: npx playwright install');
  console.log('4. Verify write permissions to the output directory');
}

export async function runInteractiveDOMGenerator(): Promise<void> {
  try {
    const options = await promptForOptions();
    
    const shouldProceed = await confirmGeneration(options);
    if (!shouldProceed) {
      console.log('👋 Generation cancelled.');
      return;
    }

    console.log('\n🚀 Starting DOM analysis and generation...');
    console.log('⏳ This may take a moment while we analyze the page...');
    
    const result = await generateStepsFromDOM(
      options.url,
      options.outputDir,
      options.featureName,
      {
        includeDataTestIds: options.includeDataTestIds,
        preferAriaLabels: options.preferAriaLabels,
        generateAssertions: options.includeAssertions,
        maxElementsPerType: options.maxElements
      }
    );

    console.log('\n🎉 Generation completed successfully!');

    if (options.testAfterGeneration) {
      await runTests(options.featureName);
      await openReports();
    } else {
      const { runNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'runNow',
          message: 'Run the generated tests now?',
          default: false
        }
      ]);

      if (runNow) {
        await runTests(options.featureName);
        await openReports();
      }
    }

    await showNextSteps(result);

  } catch (error) {
    await handleError(error);
    process.exit(1);
  }
}

// Check if this module is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runInteractiveDOMGenerator().catch(async (error) => {
    await handleError(error);
    process.exit(1);
  });
}