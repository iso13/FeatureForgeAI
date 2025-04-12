// src/support/ai/aiHelper.ts

import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// --- Types for .aiconfig.json ---
interface StepStylePattern {
  from: string;
  to: string;
}

interface AIConfig {
  stepStyles: {
    patterns: StepStylePattern[];
  };
  aiSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

// --- Load .aiconfig.json from project root ---
const configPath = path.resolve(process.cwd(), '.aiconfig.json');
if (!fs.existsSync(configPath)) {
  throw new Error(`Cannot find .aiconfig.json at ${configPath}`);
}
const { stepStyles, aiSettings } = JSON.parse(
  fs.readFileSync(configPath, 'utf8')
) as AIConfig;

// --- Initialize OpenAI client ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Helpers ---
function stripCodeFences(content: string): string {
  const lines = content.split('\n');
  if (lines[0]?.trim().startsWith('```')) lines.shift();
  if (lines[lines.length - 1]?.trim().startsWith('```')) lines.pop();
  return lines.join('\n').trim();
}

function applyStepStyles(content: string): string {
  for (const { from, to } of stepStyles.patterns) {
    content = content.replace(new RegExp(from, 'g'), to);
  }
  return content;
}

// --- Gherkin Prompt ---
export async function generateGherkinPrompt(prompt: string): Promise<string> {
  console.log('🛰️  Gherkin prompt:', prompt);
  const resp = await openai.chat.completions.create({
    model: aiSettings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: aiSettings.temperature,
    max_tokens: aiSettings.maxTokens,
  });
  const raw = resp.choices?.[0]?.message?.content ?? '';
  console.log('🛰️  Raw Gherkin from AI:', raw);
  return stripCodeFences(raw);
}

// --- Step Definitions Prompt ---
export async function generateStepDefsPrompt(prompt: string): Promise<string> {
  console.log('🛰️  Step‑defs prompt:', prompt);
  const resp = await openai.chat.completions.create({
    model: aiSettings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: aiSettings.temperature,
    max_tokens: aiSettings.maxTokens,
  });
  let code = resp.choices?.[0]?.message?.content ?? '';
  console.log('🛰️  Raw step‑defs from AI:', code);
  code = stripCodeFences(code);
  code = applyStepStyles(code);
  return code;
}

// --- Fix Prompt (optional) ---
export async function generateFixPrompt(prompt: string): Promise<string> {
  console.log('🛰️  Fix prompt:', prompt);
  const resp = await openai.chat.completions.create({
    model: aiSettings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: aiSettings.temperature,
    max_tokens: aiSettings.maxTokens,
  });
  let patch = resp.choices?.[0]?.message?.content ?? '';
  console.log('🛰️  Raw fix patch from AI:', patch);
  return stripCodeFences(patch);
}