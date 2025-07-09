// gherkinPrompt.ts (Updated)
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateGherkinPrompt(tag: string, featureTitle: string, userStory: string, scenarioCount: number): Promise<string> {
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
- Use ONLY one "When" per scenario; use "And" for follow-up steps
- Actions must use "the user provides" or "the user submits"
- Use <parameter> format for ALL values
- NEVER use UI-coupled terms like "click", "button", "field"
- Avoid imperative language; favor business outcomes
- Copy this format EXACTLY`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 3000,
  });

  const content = response.choices?.[0]?.message?.content || '';
  return content.replace(/```gherkin|```/g, '').trim();
}

// enforceDeclarativeSteps.ts (Updated)
export function enforceDeclarativeSteps(content: string): string {
  let transformed = content
    .replace(/When I enter user details(?: with (.*?))?/gi, (_, qualifier) => {
      return `When the user provides information${qualifier ? ` with ${qualifier}` : ''}`;
    })
    .replace(/When I leave mandatory fields empty/gi, 'When the user provides incomplete account information')
    .replace(/When the user submits the "Add User" action/gi, 'And the user submits the user creation')
    .replace(/Then an error message "(.*?)" should be displayed/gi, 'Then the system should display <$1>')
    .replace(/Then a confirmation message "(.*?)" should be displayed/gi, 'Then the system should display <$1>')
    .replace(/Then the new user should be listed in the system/gi, 'And the new account should be created');

  // Fix multiple When per scenario
  const lines = transformed.split('\n');
  let inScenario = false;
  let whenCount = 0;
  const fixedLines = lines.map(line => {
    if (line.trim().startsWith('Scenario:')) {
      inScenario = true;
      whenCount = 0;
    }
    if (inScenario && line.trim().startsWith('When ')) {
      whenCount++;
      if (whenCount > 1) return line.replace('When ', 'And ');
    }
    return line;
  });

  return fixedLines.join('\n');
}