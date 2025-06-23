// Refactored structure:
// src/utils/gherkinPrompt.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateGherkinPrompt(tag: string, featureTitle: string, userStory: string, scenarioCount: number): Promise<string> {
  const prompt = `Generate a Cucumber BDD feature file with:
Feature Tag: "${tag}"
Title: "${featureTitle}"
User Story: "${userStory}"
Scenarios: ${scenarioCount}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices?.[0]?.message?.content || '';
}
