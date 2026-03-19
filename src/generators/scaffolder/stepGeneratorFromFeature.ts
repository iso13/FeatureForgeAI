// src/scripts/pdfToFeature.ts
/**
 * FeatureForge AI - PDF to Feature Generator
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import fs from "fs-extra";
import path from "path";
import pdf from "pdf-parse/lib/pdf-parse.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_DIR = path.resolve(__dirname, "../../src/features/from-pdf");
const INPUT_PDF_PATH = path.resolve(
  __dirname,
  "../../input-pdfs/Getting Started with Sensitive Data Intelligence.pdf",
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = await fs.readFile(filePath);
  const pdfData = await pdf(dataBuffer);
  return pdfData.text;
}

function toLowerCamelCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

async function generateFeatureFromText(text: string): Promise<string> {
  const prompt = `Convert the following product workflow into a well-structured Cucumber BDD feature file using declarative steps. Only include Gherkin syntax. Do not add explanations.\n\n${text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a senior QA engineer generating declarative BDD feature files with clean Gherkin structure.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
    max_tokens: 2048,
  });

  const rawFeature = (response.choices[0].message.content || "").trim();

  const titleMatch = rawFeature.match(/Feature:\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : "untitled-feature";
  const featureTag = toLowerCamelCase(title);

  const domainTag = "@securiti";
  const finalFeature = `@${featureTag} ${domainTag}\n${rawFeature}`;

  return finalFeature;
}

async function writeFeatureFile(content: string, name: string) {
  await fs.ensureDir(FEATURES_DIR);
  const filePath = path.join(FEATURES_DIR, `${name}.feature`);
  await fs.writeFile(filePath, content);
  console.log(`✅ BDD Feature written to: ${filePath}`);
}

(async () => {
  try {
    const text = await extractTextFromPDF(INPUT_PDF_PATH);
    const feature = await generateFeatureFromText(text);
    const titleMatch = feature.match(/Feature:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : "untitled-feature";
    const fileName = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/gi, "");
    await writeFeatureFile(feature, fileName);
  } catch (err) {
    console.error("❌ Error generating feature from PDF:", err);
  }
})();
