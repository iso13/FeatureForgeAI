/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// Refactored structure:
// src/utils/gherkinPrompt.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateGherkinPrompt(tag: string, featureTitle: string, userStory: string, scenarioCount: number): Promise<string> {
  const declarativeGuidelines = `
CRITICAL DECLARATIVE BDD PRINCIPLES:
1. Focus on BUSINESS OUTCOMES, not UI interactions
2. Use "the user" instead of "I" for consistency
3. Avoid UI-specific terms: click, button, field, form, page
4. Use parameterized values with angle brackets: <username>, <error_message>
5. Steps should be implementation-agnostic and reusable
6. Focus on WHAT should happen, not HOW it's implemented

DECLARATIVE LANGUAGE PATTERNS:

✅ GOOD - Business-Focused:
- "When the user initiates account creation"
- "When the user provides valid account information"
- "When the user provides <username> for username"
- "Then the account should be created successfully"
- "Then the system should display <success_message>"
- "Given the user has administrator privileges"
- "When the user submits the account information"

❌ BAD - Implementation-Focused:
- "When I click the 'Sign Up' button"
- "When I fill in the email field with 'test@example.com'"
- "Then I should see a success message"
- "When I navigate to the login page"
- "When I enter my password"

PARAMETERIZATION RULES:
- Use <test_data> format for all dynamic values
- Examples: <username>, <email>, <error_message>, <success_message>
- Never use hard-coded strings like "test@example.com" or "Username already exists"
- Use descriptive parameter names that explain the data type

BUSINESS DOMAIN VOCABULARY:
- User Management: "initiates user creation", "provides account information", "submits user data"
- Authentication: "authenticates", "provides credentials", "has appropriate permissions"
- Data Operations: "provides information", "submits data", "confirms action"
- System Responses: "system displays", "account appears", "operation completes"
- Error Handling: "system validates", "displays error", "prevents action"

STEP STRUCTURE GUIDELINES:
- Background: Common Given statements (permissions, initial state)
- Given: System state and user context
- When: Business actions the user performs
- Then: Expected business outcomes
- Avoid multiple When→Then chains in single scenarios`;

  const structureTemplate = `
REQUIRED STRUCTURE:
${tag}
Feature: ${featureTitle}
  ${userStory}

Background:
  Given the user has appropriate permissions
  And the user is on the relevant system page

Scenario: [Business-focused scenario name]
  When the user [business action]
  And the user [provides data/makes choice]
  Then [expected business outcome]
  And the system should [system response]

EXAMPLE SCENARIOS FOR USER MANAGEMENT:

Scenario: Successfully create new user account
  When the user initiates user creation
  And the user provides valid account information
  And the user submits the user data
  Then the new account should be created
  And the system should display <creation_success_message>

Scenario: Prevent duplicate username registration
  When the user initiates user creation
  And the user provides existing username <duplicate_username>
  And the user submits the user data
  Then the system should prevent account creation
  And the system should display <duplicate_error_message>`;

  const prompt = `Generate EXACTLY this pattern. DO NOT deviate from this format:

${tag}
Feature: ${featureTitle}
  ${userStory}

Background:
  Given the user has administrator privileges
  And the user is on the user management system

Scenario: Successfully create user account
  When the user provides valid account information
  And the user submits the user creation
  Then the new account should be created
  And the system should display <creation_success>

Scenario: Handle duplicate username
  When the user provides information with existing username
  And the user submits the user creation
  Then the system should prevent account creation
  And the system should display <duplicate_error>

Scenario: Handle missing required fields
  When the user provides incomplete account information
  And the user submits the user creation
  Then the system should prevent account creation
  And the system should display <validation_error>

Scenario: Handle invalid email format
  When the user provides information with invalid email
  And the user submits the user creation
  Then the system should prevent account creation
  And the system should display <email_error>

Scenario: Handle weak password
  When the user provides information with weak password
  And the user submits the user creation
  Then the system should prevent account creation
  And the system should display <password_error>

MANDATORY RULES:
- Generate exactly ${scenarioCount} scenarios
- Use ONLY "the user provides" and "the user submits" 
- NEVER use "I fill", "I click", "I enter"
- Use <parameter> format for ALL values
- Use "And" not "When" for second actions
- Copy this format EXACTLY`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // Lower temperature for more consistent, structured output
      max_tokens: 3000, // Increased for more comprehensive scenarios
    });

    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message?.content || '';
      let cleaned = content.replace(/```gherkin|```/g, '').trim();

      // Remove any leading explanation before @tag or Feature:
      cleaned = cleaned.replace(/^.*?(?=@|Feature:)/s, '');

      // Remove ALL instances of the tag first to avoid duplicates
      const tagPattern = new RegExp(`^\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gm');
      cleaned = cleaned.replace(tagPattern, '');

      // Add the tag exactly once at the beginning
      cleaned = cleaned.replace(/^\s*Feature:/m, 'Feature:');
      cleaned = `${tag}\n${cleaned}`;

      // Remove trailing explanation/commentary
      const explanationIndex = cleaned.search(/\b(This feature file|All steps are|In this feature|Note:|Example:)\b/i);
      if (explanationIndex !== -1) {
        cleaned = cleaned.slice(0, explanationIndex).trim();
      }

      // Fix any "And" statements that should be "Given" at scenario start
      cleaned = cleaned.replace(/(Scenario:.*?\n)(\s*)And\b/g, '$1$2Given');

      // Clean up any double spaces or inconsistent formatting
      cleaned = cleaned
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove triple line breaks
        .replace(/^\s+$/gm, '') // Remove lines with only spaces
        .replace(/\t/g, '  '); // Convert tabs to spaces

      return cleaned;
    } else {
      console.error('No content received from OpenAI API.');
      throw new Error('No content received from OpenAI API.');
    }
  } catch (error) {
    console.error('Error generating Gherkin content:', error);
    throw new Error('Failed to generate Gherkin content.');
  }
}

/**
 * Validates that the generated Gherkin follows declarative principles
 * @param content - The generated Gherkin content
 * @returns Array of validation warnings
 */
export function validateGeneratedGherkin(content: string): string[] {
  const warnings: string[] = [];
  
  // Check for imperative language patterns
  if (/\bI\s+(click|fill|enter|go|see|navigate)/gi.test(content)) {
    warnings.push("⚠️ Imperative language detected - should use 'the user' format");
  }
  
  // Check for UI-coupled terms
  if (/\b(button|field|form|page|click|navigate)\b/gi.test(content)) {
    warnings.push("⚠️ UI-coupled language detected - use business-focused terms");
  }
  
  // Check for hard-coded values
  if (/"[^"<>]*@[^"]*\.[^"]*"|"test[^"]*"|"admin[^"]*"/gi.test(content)) {
    warnings.push("🔧 Hard-coded test data detected - should use parameterized values");
  }
  
  // Check for missing parameterization
  if (/"[^"<>]+"/.test(content) && !/<[^>]+>/.test(content)) {
    warnings.push("📝 Consider parameterizing quoted values with angle brackets");
  }
  
  // Check scenario count
  const scenarioCount = (content.match(/^\s*Scenario:/gm) || []).length;
  if (scenarioCount === 0) {
    warnings.push("❌ No scenarios found in generated content");
  }
  
  // Check for background section
  if (!/Background:/i.test(content)) {
    warnings.push("📋 Consider adding a Background section for common setup");
  }
  
  return warnings;
}

/**
 * Generates scenario-specific prompts for complex features
 * @param scenarioType - Type of scenario to generate
 * @param context - Additional context for the scenario
 * @returns Specialized prompt for the scenario type
 */
export function generateScenarioPrompt(scenarioType: 'happy-path' | 'error-handling' | 'edge-case' | 'permissions', context: string): string {
  const basePrompts = {
    'happy-path': `Focus on the successful completion of the business process with valid data and proper permissions.`,
    'error-handling': `Focus on system validation and error responses when invalid data or improper actions are attempted.`,
    'edge-case': `Focus on boundary conditions, unusual but valid inputs, and system limits.`,
    'permissions': `Focus on access control, authorization checks, and role-based restrictions.`
  };
  
  return `${basePrompts[scenarioType]} Context: ${context}. Use declarative, business-focused language with parameterized test data.`;
}