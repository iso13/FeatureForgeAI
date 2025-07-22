// src/scripts/run-cucumber.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { spawn } from 'child_process';
import * as path from 'path';
import * as process from 'process';

const args = process.argv.slice(2); // forward all args (e.g., --tags "@hipaa-164.310-a-1")
const cucumberPath = path.resolve('node_modules/.bin/cucumber-js');

const command = [
  cucumberPath,
  '--config', 'cucumber.mjs',
  '--format', 'cucumber-console-formatter',
  ...args,
];

const proc = spawn('tsx', command, { stdio: 'inherit', shell: true });

proc.on('exit', (code) => {
  if (code === 0) {
    // archive after success
    const archive = spawn('tsx', ['src/scripts/archiveCucumberReports.ts'], { stdio: 'inherit', shell: true });
    archive.on('exit', (archiveCode) => process.exit(archiveCode));
  } else {
    process.exit(code ?? 1);
  }
});