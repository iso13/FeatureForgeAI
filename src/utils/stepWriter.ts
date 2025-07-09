/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// src/utils/stepWriter.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateStepDefinitions(gherkinContent: string): Promise<string> {
  const parameterizationGuidelines = `
CRITICAL PARAMETERIZATION REQUIREMENTS:
1. NEVER use hard-coded strings in step definitions
2. ALWAYS use Cucumber expressions with {string}, {int}, {float} parameters
3. Extract ALL dynamic values using regex capture groups
4. Create reusable steps that work across multiple scenarios
5. Use descriptive parameter names in function signatures

PARAMETERIZATION PATTERNS:

✅ CORRECT - Parameterized:
Given('the user has {string} privileges', async function(roleType: string) { ... })
When('the user provides {string} for the {string} field', async function(value: string, fieldName: string) { ... })
When('the user initiates {string}', async function(action: string) { ... })
Then('the system should display {string}', async function(message: string) { ... })
Then('the {string} should appear in the system', async function(entityType: string) { ... })

❌ WRONG - Hard-coded:
Given('the user has administrator privileges', async function() { ... })
When('the user provides "test@example.com" for the "email" field', async function() { ... })
Then('the system should display "User created successfully"', async function() { ... })`;

  const playwrightBestPractices = `
PLAYWRIGHT IMPLEMENTATION GUIDELINES:

1. MULTIPLE SELECTOR STRATEGIES:
   Use fallback selectors for robustness:
   const selector = \`[data-testid="\${action}-btn"], button:has-text("\${action}"), button[title*="\${action}"]\`;

2. DYNAMIC SELECTOR CONSTRUCTION:
   Build selectors using parameters:
   const fieldSelector = \`input[name="\${fieldName}"], [data-testid="\${fieldName}-input"], input[placeholder*="\${fieldName}"]\`;

3. ERROR HANDLING:
   Always wrap in try-catch with descriptive errors:
   try {
     await this.page.waitForSelector(selector, { timeout: 15000 });
   } catch (error) {
     throw new Error(\`Failed to find \${elementType} for \${action}: \${error}\`);
   }

4. WAIT STRATEGIES:
   Use appropriate waits for different actions:
   - Navigation: await this.page.waitForLoadState('networkidle');
   - Dynamic content: await this.page.waitForSelector(selector);
   - State changes: await this.page.waitForFunction(() => condition);

5. ASSERTION PATTERNS:
   Use Playwright's expect with parameterized messages:
   await expect(this.page.locator(messageSelector)).toContainText(expectedMessage);

COMMON SELECTOR PATTERNS:
- Buttons: \`button:has-text("\${text}"), [data-testid*="\${action}"], button[type="submit"]\`
- Inputs: \`input[name="\${name}"], [data-testid="\${name}-input"], input[placeholder*="\${name}"]\`
- Messages: \`.message, [role="alert"], [data-testid*="message"], .notification\`
- Lists/Tables: \`[data-testid="list"], table, .items-container\`
- Navigation: \`nav a:has-text("\${text}"), [data-testid="nav-\${section}"]\``;

  const prompt = `Generate complete TypeScript Cucumber step definitions using Playwright for the following Gherkin scenarios.

CRITICAL: Generate ONLY the step definitions code. 
Do NOT include any explanatory text, comments about best practices, or descriptions.
Do NOT add any text after the final step definition.

${parameterizationGuidelines}

${playwrightBestPractices}

CRITICAL REQUIREMENTS:
1. Import statements: import { Given, When, Then } from '@cucumber/cucumber'; import { expect } from '@playwright/test';
2. Use ONLY parameterized step definitions with {string}, {int}, {float} patterns
3. NEVER hard-code values - extract ALL dynamic content as parameters
4. Use multiple selector strategies with template literals
5. Include comprehensive error handling with descriptive messages
6. Use async/await with proper Playwright page methods
7. Add timeouts (15000ms) for all waitForSelector calls
8. Use this.page for all Playwright interactions
9. Create reusable steps that work across different scenarios
10. Build selectors dynamically using function parameters

STEP PATTERN EXAMPLES:
- "the user has {string} privileges" → function(roleType: string)
- "the user provides {string} for {string}" → function(value: string, fieldName: string)
- "the user initiates {string}" → function(action: string)
- "the system should display {string}" → function(message: string)
- "the {string} should appear in {string}" → function(item: string, location: string)

AVOID:
- Hard-coded strings in step patterns
- Single selector strategies without fallbacks
- Missing error handling
- Non-parameterized step definitions
- Chai assertions (use Playwright's expect)
- Synchronous operations

GHERKIN CONTENT TO CONVERT:
${gherkinContent}

Generate only the step definition functions - no explanatory text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Very low temperature for consistent code generation
      max_tokens: 4000, // Increased for comprehensive step definitions
    });

    if (response.choices && response.choices.length > 0) {
      let stepDefinitions = (response.choices[0].message?.content || '')
        .replace(/```typescript|```/g, '')
        .replace(/Below are the.*?definitions.*?\n/gs, '')
        .replace(/###.*?\n/gs, '')
        .trim();

      // Post-process to ensure quality and remove any remaining commentary
      stepDefinitions = improveStepDefinitions(stepDefinitions);
      stepDefinitions = ensureParameterization(stepDefinitions);

      return stepDefinitions;
    } else {
      console.error('No content received from OpenAI API.');
      throw new Error('No content received from OpenAI API.');
    }
  } catch (error) {
    console.error('Error generating step definitions:', error);
    throw new Error('Failed to generate step definitions.');
  }
}

/**
 * Improves the generated step definitions with additional best practices
 * @param content - The generated step definitions
 * @returns Enhanced step definitions
 */
function improveStepDefinitions(content: string): string {
  // Ensure proper imports are at the top
  if (!content.includes('import { expect } from \'@playwright/test\'')) {
    content = 'import { Given, When, Then } from \'@cucumber/cucumber\';\nimport { expect } from \'@playwright/test\';\n\n' + content;
  }

  // Fix common issues and remove commentary
  content = content
    // Remove any explanatory text at the end
    .replace(/This TypeScript code follows.*?scenarios\./gs, '')
    .replace(/\n\s*This TypeScript.*$/gs, '')
    .replace(/\n\s*The above.*$/gs, '')
    .replace(/\n\s*This code.*$/gs, '')
    
    // Ensure proper timeout format
    .replace(/waitForSelector\('([^']+)'(?!, \{ timeout)/g, 'waitForSelector(\'$1\', { timeout: 15000 }')
    // Add networkidle after navigation
    .replace(/(await this\.page\.goto\([^)]+\);)/g, '$1\n    await this.page.waitForLoadState("networkidle");')
    // Fix incomplete assertions
    .replace(/\/\/ Assuming.*?$/gm, '// TODO: Implement specific verification logic')
    // Ensure template literals for dynamic selectors
    .replace(/('[^']*\$\{[^}]+\}[^']*')/g, '`$1`'.replace(/'/g, ''))
    // Fix error messages to use template literals
    .replace(/throw new Error\('([^']*)\$\{([^}]+)\}([^']*)'\)/g, 'throw new Error(`$1${$2}$3`)');

  return finalCleanup(content);
}

/**
 * Ensures all step definitions are properly parameterized
 * @param content - The step definitions content
 * @returns Content with enforced parameterization
 */
function ensureParameterization(content: string): string {
  // Check for hard-coded step patterns and warn
  const hardCodedPatterns = [
    /'[^']*administrator[^']*'/gi,
    /'[^']*test@example\.com[^']*'/gi,
    /'[^']*User created successfully[^']*'/gi,
    /'[^']*Add User[^']*'/gi
  ];

  hardCodedPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.warn('⚠️ Hard-coded values detected in step definitions - should be parameterized');
    }
  });

  // Replace any remaining hard-coded step patterns with parameterized versions
  content = content
    .replace(/Given\('the user has administrator privileges'/gi, 'Given(\'the user has {string} privileges\'')
    .replace(/When\('the user provides "([^"]+)" for "([^"]+)"'/gi, 'When(\'the user provides {string} for {string}\'')
    .replace(/Then\('the system should display "([^"]+)"'/gi, 'Then(\'the system should display {string}\'')
    .replace(/function\(\)\s*{/gi, 'function(param: string) {')
    .replace(/function\(([^)]*)\)\s*{/gi, (match, params) => {
      if (!params.includes(':')) {
        const paramCount = (params.match(/,/g) || []).length + 1;
        const typedParams = Array.from({length: paramCount}, (_, i) => `param${i + 1}: string`).join(', ');
        return `function(${typedParams}) {`;
      }
      return match;
    });

  return content;
}

/**
 * Final cleanup and formatting
 * @param content - The step definitions content
 * @returns Cleaned and formatted content
 */
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
      'throw new Error(`$1: ${error}`);')
    // Ensure consistent indentation
    .replace(/^  /gm, '    ') // Convert 2-space to 4-space indentation
    // Remove extra blank lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove any remaining trailing explanatory text
    .replace(/\n\s*This (?:TypeScript )?code.*$/gs, '')
    .replace(/\n\s*The (?:above )?.*?(?:best practices|Playwright|Cucumber).*$/gs, '')
    .trim();
}

/**
 * Validates that step definitions are properly parameterized
 * @param content - The step definitions content
 * @returns Array of validation warnings
 */
export function validateStepDefinitions(content: string): string[] {
  const warnings: string[] = [];
  
  // Check for hard-coded step patterns
  if (/'[^']*(?:test@|admin|User created|Add User)[^']*'/i.test(content)) {
    warnings.push("❌ Hard-coded values found in step patterns - should use {string} parameters");
  }
  
  // Check for missing parameterization
  const stepPatterns = content.match(/(Given|When|Then)\('([^']+)'/g) || [];
  stepPatterns.forEach(pattern => {
    if (!pattern.includes('{string}') && !pattern.includes('{int}') && pattern.includes('"')) {
      warnings.push(`⚠️ Step pattern may need parameterization: ${pattern}`);
    }
  });
  
  // Check for proper function signatures
  const functionMatches = content.match(/function\([^)]*\)/g) || [];
  functionMatches.forEach(func => {
    if (func === 'function()' && content.includes('{string}')) {
      warnings.push("📝 Function signature missing parameters despite {string} in step pattern");
    }
  });
  
  // Check for proper imports
  if (!content.includes('import { Given, When, Then }')) {
    warnings.push("📦 Missing Cucumber imports");
  }
  
  if (!content.includes('import { expect }')) {
    warnings.push("📦 Missing Playwright expect import");
  }
  
  // Check for explanatory text
  if (/This (?:TypeScript )?code|The above|best practices/i.test(content)) {
    warnings.push("🧹 Explanatory text detected - should be removed");
  }
  
  return warnings;
}

/**
 * Extracts unique step patterns from Gherkin content for analysis
 * @param gherkinContent - The Gherkin feature content
 * @returns Array of unique step patterns
 */
export function extractStepPatterns(gherkinContent: string): string[] {
  const stepRegex = /^\s*(Given|When|Then|And|But)\s+(.+)$/gm;
  const steps: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = stepRegex.exec(gherkinContent)) !== null) {
    const stepText = match[2].trim()
      .replace(/<[^>]+>/g, '{string}') // Convert angle brackets to Cucumber expressions
      .replace(/"\$\{[^}]+\}"/g, '{string}') // Convert template literals to parameters
      .replace(/"[^"]+"/g, '{string}'); // Convert quoted strings to parameters
    
    if (!steps.includes(stepText)) {
      steps.push(stepText);
    }
  }

  return steps;
}