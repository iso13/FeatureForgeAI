// src/scripts/featureGeneratorOpenAI.ts
/**
 * FeatureForge AI - v19 Enhanced OpenAI Feature Generator 
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import OpenAI from 'openai';
import fsExtra from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import inquirer from 'inquirer';

dotenv.config();

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_DIR = path.resolve(__dirname, '../../src/features');
const STEPS_DIR = path.resolve(__dirname, '../../src/steps');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerationResult {
  featureContent: string;
  stepDefinitions: string;
  metadata: {
    featureName: string;
    generationTime: number;
    scenarioCount: number;
  };
}

interface FeatureRequest {
  featureTitle: string;
  userStory: string;
  scenarioCount: number;
}

class EnhancedOpenAIGenerator {

  /**
   * Generate both feature and step definitions in a single OpenAI call
   */
  async generateBothInParallel(featureRequest: FeatureRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Generating feature and step definitions in one OpenAI call...');
      
      // Generate both in a single call for perfect synchronization
      const result = await this.generateBothWithSingleCall(featureRequest);
      
      const generationTime = Date.now() - startTime;
      
      return {
        featureContent: result.feature,
        stepDefinitions: result.steps,
        metadata: {
          featureName: featureRequest.featureTitle,  // Fixed: use featureTitle
          generationTime,
          scenarioCount: this.countScenarios(result.feature)
        }
      };
      
    } catch (error) {
      console.error('❌ Single-call OpenAI generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate both feature and step definitions in a single OpenAI call for perfect sync
   */
  private async generateBothWithSingleCall(featureRequest: FeatureRequest): Promise<{feature: string, steps: string}> {
    const tag = this.generateFeatureTag(featureRequest.featureTitle);
    
    const prompt = `You are a BDD expert. Generate BOTH a Cucumber feature file AND matching step definitions.

TASK: Create feature file + step definitions for "${featureRequest.featureTitle}"

USER STORY: "${featureRequest.userStory}"
CORE SCENARIOS: ${featureRequest.scenarioCount}

CRITICAL RULES:
❌ NEVER use: "click", "button", "field", "page", "form", "input", "I should see"
❌ NEVER put Given steps in scenarios (only in Background)
❌ NEVER create steps for the user story text itself
❌ NEVER use @error-handling or @edge-case tags
❌ NEVER create generic/boring scenarios - be creative and realistic

✅ FEATURE FORMAT:
\`\`\`gherkin
${tag}
Feature: ${featureRequest.featureTitle}

  As a [role]
  I want [capability]
  So that [benefit]

  Background:
    Given [realistic common setup that applies to ALL scenarios]
    And [additional meaningful setup]

  Scenario: [Specific, realistic business scenario with context]
    When [detailed business condition with real-world context]
    Then [specific business outcome with measurable result]
    And [additional meaningful outcome]

  Scenario: [Creative scenario considering edge cases naturally]
    When [interesting business condition that could really happen]
    Then [realistic business response or outcome]
    And [additional business impact]

  Scenario: [Scenario that tests business rules or constraints]
    When [boundary condition or business rule test]
    Then [appropriate system behavior]
    And [business-appropriate messaging or handling]

  Scenario: [Complex realistic scenario with multiple conditions]
    When [multi-step business condition]
    And [additional realistic constraint]
    Then [comprehensive business outcome]
    And [follow-up business result]
\`\`\`

CREATIVITY GUIDELINES:
✅ Think about real-world user behavior and business constraints
✅ Include realistic data (quantities, prices, product names, user types)
✅ Consider business rules, inventory, pricing, user permissions
✅ Create scenarios that business stakeholders would actually care about
✅ Add context that makes scenarios feel authentic and valuable
✅ Think about what could actually go wrong or what edge cases exist
✅ Consider different user types, seasonal behavior, or business cycles

✅ STEP DEFINITIONS FORMAT:
\`\`\`typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('exact text from Background', async function (this: CustomWorld) {
  await this.page.goto('/dashboard');
  await expect(this.page.locator('[data-testid="element"]')).toHaveText(/expected/i);
});

When('exact text from When step', async function (this: CustomWorld) {
  await this.page.click('[data-testid="action-element"]');
  await this.page.waitForLoadState('networkidle');
});

Then('exact text from Then step', async function (this: CustomWorld) {
  const element = await this.page.locator('[data-testid="result-element"]');
  await expect(element).toBeVisible();
});
\`\`\`

REQUIREMENTS:
1. Generate step definitions for EVERY step in the feature (exact text match)
2. Use ONLY standard Playwright methods
3. NO comments in step definitions
4. Use data-testid selectors
5. Focus on business language, not UI actions
6. Background steps apply to ALL scenarios (no Given in scenarios)
7. NO @error-handling or @edge-case tags - just descriptive Scenario names
8. CREATE REALISTIC, CREATIVE scenarios with business context and specific details
9. Avoid generic phrases like "should be" - use specific business outcomes
10. Include realistic data, constraints, and business rules in scenarios

OUTPUT: Feature file first, then step definitions. Separate them with "---STEP_DEFINITIONS---"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4000
    });

    const content = response.choices?.[0]?.message?.content || '';
    
    // Split the response into feature and step definitions
    const parts = content.split('---STEP_DEFINITIONS---');
    
    if (parts.length !== 2) {
      throw new Error('OpenAI did not return properly formatted response with separator');
    }
    
    const feature = this.cleanFeatureResponse(parts[0].trim(), tag);
    const steps = this.cleanStepDefinitionsResponse(parts[1].trim());
    
    return { feature, steps };
  }

  /**
   * Clean feature response from OpenAI
   */
  private cleanFeatureResponse(content: string, tag: string): string {
    // Remove code block markers
    content = content.replace(/```gherkin|```/g, '').trim();
    
    // Remove anything before the tag or Feature
    content = content.replace(/^.*?(?=@|Feature:)/s, '');
    
    // Remove duplicate tags
    const tagPattern = new RegExp(`^\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gm');
    content = content.replace(tagPattern, '');
    
    // Ensure proper Feature line
    content = content.replace(/^\s*Feature:/m, 'Feature:');
    
    // Add tag at the beginning if not present
    if (!content.startsWith('@')) {
      content = `${tag}\n${content}`;
    }
    
    // Remove any "In order to..." lines that got inserted
    content = content.replace(/^\s*In order to[^\n]*\n/gm, '');
    
    // Remove OpenAI explanations
    const explanationIndex = content.search(/\bThis feature file\b|\bNote:\b|\bExplanation:\b/i);
    if (explanationIndex !== -1) {
      content = content.slice(0, explanationIndex).trim();
    }
    
    return content;
  }

  /**
   * Clean step definitions response from OpenAI
   */
  private cleanStepDefinitionsResponse(content: string): string {
    // Remove code block markers
    content = content.replace(/```typescript|```ts|```/g, '').trim();
    
    // Remove any leading explanatory text
    const importIndex = content.indexOf('import');
    if (importIndex > 0) {
      content = content.substring(importIndex);
    }
    
    // Remove trailing explanations
    const explanationIndex = content.search(/\n\n\/\/ Note:|This step definitions|These step definitions/i);
    if (explanationIndex !== -1) {
      content = content.slice(0, explanationIndex).trim();
    }
    
    // Remove all comments
    content = content.replace(/^\s*\/\/.*$/gm, '');
    
    // Clean up extra whitespace
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return content;
  }

  /**
   * Validate that generated content is declarative
   */
  private validateDeclarativeContent(content: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // Check for forbidden UI terms
    const forbiddenTerms = ['click', 'button', 'field', 'page', 'form', 'input', 'dropdown', 'I should see', 'should be visible'];
    forbiddenTerms.forEach(term => {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        violations.push(`Contains forbidden UI term: "${term}"`);
      }
    });
    
    // Check for Given steps in scenarios (after Background)
    const scenarioRegex = /Scenario:[^\n]*\n([\s\S]*?)(?=\nScenario:|\n@|\n*$)/g;
    let match;
    while ((match = scenarioRegex.exec(content)) !== null) {
      const scenarioBody = match[1];
      if (scenarioBody.includes('\n    Given ')) {
        violations.push('Contains Given steps in scenario (should be in Background only)');
        break;
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Generate only feature file (public method) - now uses single call approach
   */
  async generateFeatureOnly(featureRequest: FeatureRequest): Promise<string> {
    const result = await this.generateBothWithSingleCall(featureRequest);
    return result.feature;
  }

  /**
   * Generate only step definitions (public method) - now uses single call approach  
   */
  async generateStepDefinitionsOnly(featureRequest: FeatureRequest): Promise<string> {
    const result = await this.generateBothWithSingleCall(featureRequest);
    return result.steps;
  }

  /**
   * Parallel file writing
   */
  async writeFilesInParallel(
    result: GenerationResult,
    featurePath: string,
    stepsPath: string
  ): Promise<void> {
    
    const writePromises = [
      fsExtra.ensureDir(FEATURES_DIR)
        .then(() => fsExtra.writeFile(featurePath, result.featureContent, 'utf8'))
        .then(() => console.log(`✅ Feature file saved: ${featurePath}`))
        .catch(error => console.error(`❌ Failed to write feature file: ${error}`)),
      
      fsExtra.ensureDir(STEPS_DIR)
        .then(() => fsExtra.writeFile(stepsPath, result.stepDefinitions, 'utf8'))
        .then(() => console.log(`✅ Step definitions saved: ${stepsPath}`))
        .catch(error => console.error(`❌ Failed to write steps file: ${error}`))
    ];
    
    await Promise.allSettled(writePromises);
  }

  // Utility methods
  private generateFeatureTag(featureTitle: string): string {
    return `@${featureTitle.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, str => str.toLowerCase())}`;
  }

  private countScenarios(featureContent: string): number {
    return (featureContent.match(/^\s*Scenario:/gm) || []).length;
  }
}

/**
 * Enhanced interactive prompt for OpenAI generation
 */
async function runInteractivePrompt() {
  console.log('🤖 FeatureForge AI - v19 Enhanced OpenAI Generator (Single Call)\n');
  
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
      message: 'Enter the user story (As a... I want... So that...):',
      validate: input => input.trim().toLowerCase().startsWith('as ') ? true : 'User story must start with "As a...".',
    },
    {
      type: 'input',
      name: 'scenarioCount',
      message: 'Enter the number of core scenarios (1–6):',
      default: '3',
      validate: input => {
        const n = parseInt(input, 10);
        return (n >= 1 && n <= 6) ? true : 'Must be between 1 and 6.';
      }
    }
  ]);

  const featureRequest: FeatureRequest = {
    featureTitle: answers.featureTitle,
    userStory: answers.userStory,
    scenarioCount: parseInt(answers.scenarioCount, 10)
  };

  const generator = new EnhancedOpenAIGenerator();
  
  try {
    // Always generate both using single-call approach
    const result = await generator.generateBothInParallel(featureRequest);
    
    // Validate content quality
    const validation = generator['validateDeclarativeContent'](result.featureContent);
    if (!validation.isValid) {
      console.warn('⚠️  Generated content has issues:');
      validation.violations.forEach(violation => console.warn(`   - ${violation}`));
    }
    
    const sanitizedName = featureRequest.featureTitle.replace(/\s+/g, '');
    const featurePath = path.join(FEATURES_DIR, `${sanitizedName}.feature`);
    const stepsPath = path.join(STEPS_DIR, `${sanitizedName.toLowerCase()}.steps.ts`);
    
    await generator.writeFilesInParallel(result, featurePath, stepsPath);
    
    console.log('\n📊 Generation Summary:');
    console.log(`   🎯 Feature: ${result.metadata.featureName}`);
    console.log(`   📝 Scenarios: ${result.metadata.scenarioCount}`);
    console.log(`   ⚡ Generation time: ${result.metadata.generationTime}ms`);
    console.log(`   🤖 v19 Single-call OpenAI generation completed!`);
    console.log(`   📄 Generated both feature file and step definitions in one call`);
    
    if (validation.isValid) {
      console.log(`   ✅ Content quality: All declarative practices followed!`);
    }
    
  } catch (error) {
    console.error('❌ v19 OpenAI generation failed:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('💡 Make sure your OPENAI_API_KEY is set in your .env file');
    }
  }
}

// Run the interactive prompt
runInteractivePrompt().catch(console.error);