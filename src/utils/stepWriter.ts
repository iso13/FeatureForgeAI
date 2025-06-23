// src/utils/stepWriter.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateStepDefinitions(gherkinContent: string): Promise<string> {
  const prompt = `Convert the following Gherkin to Playwright step defs:\n${gherkinContent}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 3000,
  });

  return response.choices?.[0]?.message?.content || '';
}
