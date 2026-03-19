// src/scripts/generateDOMFeature.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { DOMGenerator } from "../utils/dom-generator";
import { enforceDeclarativeSteps } from "../utils/enforceDeclarative";
import { writeFile } from "fs/promises";
import { join } from "path";
import inquirer from "inquirer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const FEATURES_DIR = path.resolve(__dirname, "../../src/features");
const STEPS_DIR = path.resolve(__dirname, "../../src/steps");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateStepDefinitions(gherkin: string): Promise<string> {
  const prompt = `Generate TypeScript step definitions from the following Gherkin feature using Cucumber and Playwright.

REQUIREMENTS:
- Use: import { Given, When, Then } from '@cucumber/cucumber';
- Use: import { expect } from '@playwright/test';
- Use: import type { CustomWorld } from '../support/world';
- Each step function must be declared with (this: CustomWorld, ...args)
- Use 'this.page' for all Playwright actions and selectors
- Replace quoted values (e.g., "Login", "Upload") with {string} and use the variable
- NEVER use undeclared placeholders like "label" or "field"
- Normalize "document" steps to: When the Admin selects the {string} document
- Keep steps DRY, declarative, and reusable
- Use try/catch and throw readable errors

DO NOT return any markdown or explanation — only TypeScript.

Gherkin Feature:
${gherkin}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.2,
    max_tokens: 2800,
    messages: [{ role: "user", content: prompt }],
  });

  return (
    res.choices?.[0]?.message?.content
      ?.replace(/```typescript/g, "")
      .replace(/```/g, "")
      .trim() ?? ""
  );
}

async function main() {
  const { url, featureName } = await inquirer.prompt([
    {
      type: "input",
      name: "url",
      message: "Enter the page URL to analyze:",
      validate: (input: string) =>
        input.startsWith("http") ? true : "Please enter a valid URL.",
    },
    {
      type: "input",
      name: "featureName",
      message: "Enter the feature name (e.g., Upload Document):",
      validate: (input: string) =>
        input.trim().length > 2 || "Feature name is required.",
    },
  ]);

  const generator = new DOMGenerator();
  const outputPath = FEATURES_DIR;
  const slug = featureName.toLowerCase().replace(/\s+/g, "-");
  const stepSlug = featureName.toLowerCase().replace(/\s+/g, "");

  try {
    const analysis = await generator.analyzePage(url);
    const rawFeature = generator.generateFeature(analysis, featureName);
    const normalized = enforceDeclarativeSteps(rawFeature);
    const stepDefs = await generateStepDefinitions(normalized);

    const featurePath = join(FEATURES_DIR, `${slug}.feature`);
    const stepPath = join(STEPS_DIR, `${stepSlug}.steps.ts`);

    await writeFile(featurePath, normalized, "utf8");
    await writeFile(stepPath, stepDefs, "utf8");

    console.log(`Feature saved to: ${featurePath}`);
    console.log(`Step definitions saved to: ${stepPath}`);
  } catch (error) {
    console.error("Failed to generate DOM-based feature:", error);
  } finally {
    await generator.cleanup();
  }
}

main();
