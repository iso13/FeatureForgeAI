// src/scripts/automationScaffolder.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import OpenAI from "openai";
import dotenv from "dotenv";
import {
  Parser,
  AstBuilder,
  GherkinClassicTokenMatcher,
} from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

dotenv.config();

const generator = IdGenerator.uuid();
const FEATURES_DIR = path.resolve("src/features");
const STEPS_DIR = path.resolve("src/steps");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4";

/**
 * 🔧 Remove markdown fences and any explanatory prose from LLM output
 */
function cleanCompletion(text: string): string {
  return (
    text
      // Strip common markdown fences
      .replace(/```typescript/g, "")
      .replace(/```/g, "")
      // Strip prose that starts with "This step definition" or similar
      .replace(/This step definition[\s\S]*/gi, "")
      // Keep only the Given/When/Then code downwards
      .replace(/^[\s\S]*?(?=(Given|When|Then)\()/m, "")
      .trim()
  );
}

// ⏱️ Timeout wrapper for LLM calls
async function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LLM request timed out")), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function generateStepImplementation(
  stepText: string,
  keyword: string,
): Promise<string> {
  console.log(`📝 Generating implementation for step: "${stepText}" [${keyword}]`);

  const prompt = `You are a senior QA engineer writing Playwright+Cucumber step definitions.
Convert the following BDD step into a TypeScript step definition with meaningful Playwright code.

REQUIREMENTS:
- ONLY return valid TypeScript code.
- DO NOT include markdown fences, prose, or explanations.
- Import { Given, When, Then } from '@cucumber/cucumber'
- Import { expect } from '@playwright/test'
- Import type { CustomWorld } from '../support/world'
- Each step must use (this: CustomWorld)

Step:
${keyword}("${stepText}", async function (this: CustomWorld) {`;

  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You write concise, valid Playwright+Cucumber+TypeScript step definitions. Only output code.",
          },
          { role: "user", content: prompt },
        ],
      }),
      20000,
    );

    const completion = response.choices?.[0]?.message?.content?.trim();
    if (completion) return cleanCompletion(completion);
  } catch (err: any) {
    console.warn(`⚠️ AI generation failed for step "${stepText}". Error: ${err.message}`);
    console.log("↩️ Retrying once...");
    try {
      const retryResponse = await withTimeout(
        openai.chat.completions.create({
          model: MODEL,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You write concise, valid Playwright+Cucumber+TypeScript step definitions. Only output code.",
            },
            { role: "user", content: prompt },
          ],
        }),
        20000,
      );
      const retryCompletion = retryResponse.choices?.[0]?.message?.content?.trim();
      if (retryCompletion) return cleanCompletion(retryCompletion);
    } catch (retryErr: any) {
      console.error(`❌ Retry also failed for step "${stepText}". Error: ${retryErr.message}`);
    }
  }

  // ✅ Always return a stub if LLM fails
  return `${keyword}("${stepText}", async function (this: CustomWorld) {
  // TODO: implement step
});`;
}

function normalizeKeyword(keyword: string, previous: string): string {
  if (keyword.trim() === "And") {
    return previous || "Given";
  }
  return keyword.trim();
}

async function scaffoldMissingSteps() {
  // Accept optional CLI arg: e.g. `npm run feature:scaffold ValidatePatientDataSynchronization.feature`
  const [, , argFile] = process.argv;
  let featurePaths: string[];

  if (argFile) {
    const targetPath = path.resolve(FEATURES_DIR, argFile);
    if (!(await fs.pathExists(targetPath))) {
      console.error(`❌ Feature file not found: ${targetPath}`);
      process.exit(1);
    }
    featurePaths = [targetPath];
    console.log(`🎯 Scaffolding only for: ${argFile}`);
  } else {
    featurePaths = await glob(`${FEATURES_DIR}/**/*.feature`);
    console.log(`📂 Scaffolding all features in ${FEATURES_DIR}`);
  }

  const parser = new Parser(
    new AstBuilder(generator),
    new GherkinClassicTokenMatcher(),
  );

  for (const file of featurePaths) {
    console.log(`\n🔍 Processing feature file: ${file}`);
    const content = await fs.readFile(file, "utf-8");
    const gherkinDocument = parser.parse(content);

    const feature = gherkinDocument.feature;
    if (!feature) continue;

    const featureSlug = feature.name.toLowerCase().replace(/\s+/g, "-");
    const stepDefsPath = path.resolve(STEPS_DIR, `${featureSlug}.steps.ts`);
    const existingCode = (await fs.pathExists(stepDefsPath))
      ? await fs.readFile(stepDefsPath, "utf-8")
      : "";

    let newSteps = "";
    for (const child of feature.children) {
      if (!child || !child.scenario) continue;

      let previousKeyword = "Given";
      for (const step of child.scenario.steps) {
        const keyword = normalizeKeyword(step.keyword, previousKeyword);
        previousKeyword = keyword;

        const stepAlreadyExists = existingCode.includes(step.text);
        if (!stepAlreadyExists) {
          const impl = await generateStepImplementation(step.text, keyword);
          newSteps += `\n${impl}\n`;
        } else {
          console.log(`✔ Step already exists: "${step.text}"`);
        }
      }
    }

    if (newSteps.trim()) {
      const header = `import { Given, When, Then } from '@cucumber/cucumber';\nimport { expect } from '@playwright/test';\nimport type { CustomWorld } from '../support/world';\n\n`;
      const output = existingCode || header;
      await fs.writeFile(stepDefsPath, output + newSteps);
      console.log(
        `✅ Updated ${path.basename(stepDefsPath)} with AI-powered step definitions.`,
      );
    } else {
      console.log(`ℹ️ No new steps to scaffold for ${file}`);
    }
  }
}

scaffoldMissingSteps().catch((err) => {
  console.error("❌ Failed to scaffold steps:", err);
});