import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Page } from '@playwright/test';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Resolves a natural language DOM element description to a Playwright selector
 * using OpenAI and the current page content.
 */
export async function aiResolveSelector(
  page: Page,
  description: string
): Promise<string> {
  const html = await page.content();
  const prompt = `Given the following HTML, return a valid Playwright selector for: "${description}". Provide only the selector.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: prompt + '\n\n' + html.substring(0, 10000), // truncate long DOM
      },
    ],
    max_tokens: 100,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}