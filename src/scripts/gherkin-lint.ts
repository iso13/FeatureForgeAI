/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// scripts/gherkin-lint.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGherkin } from './gherkinParser.js'; // make sure this uses .js in ESM builds

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively find all .feature files in the given directory
function findFeatureFiles(dir: string, found: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFeatureFiles(fullPath, found);
    } else if (entry.isFile() && fullPath.endsWith('.feature')) {
      found.push(fullPath);
    }
  }

  return found;
}

// Main logic for linting
export async function runLint() {
  const featuresDir = path.join(__dirname, '../features'); // use correct relative path
  const featureFiles = findFeatureFiles(featuresDir);

  for (const file of featureFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const errors = parseGherkin(content); // your custom linting logic
    const relativePath = path.relative(featuresDir, file);
    if (errors.length > 0) {
      console.error(`${relativePath} has ${errors.length} issues:`, errors);
      process.exitCode = 1;
    } else {
      console.log(`${relativePath} passed`);
    }
  }
}

// Execute if run directly (e.g., `tsx scripts/gherkin-lint.ts`)
if (import.meta.url === `file://${process.argv[1]}`) {
  runLint().catch(err => {
    console.error('Gherkin lint failed:', err);
    process.exit(1);
  });
}