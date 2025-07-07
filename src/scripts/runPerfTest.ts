/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { execSync } from 'child_process';
import open from 'open';
import path from 'path';
import fs from 'fs';

const reportDir = path.resolve(__dirname, '../../reports/performance');
const k6Script = path.resolve(__dirname, '../support/performance/loadTest.js');

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const envVars: Record<string, string> = {
  VUS: '5',
  DURATION: '10s',
  ENDPOINT: '/posts',
  METHOD: 'GET',
};

const command = [
  'k6 run',
  '--out experimental-prometheus-rw=http://localhost:9090/api/v1/write',
  `--out json=${path.join(reportDir, 'loadTest.json')}`,
  `"${k6Script}"`
].join(' ');

try {
  console.log('Running k6 load test...\n');
  console.log(`> ${command}\n`);

  const result = execSync(command, {
    env: { ...process.env, ...envVars },
    stdio: 'pipe'
  });

  console.log(result.toString());

  console.log('Load test completed. Opening Grafana...');
  open('http://localhost:3000/dashboards');
} catch (error: any) {
  console.error('k6 test failed.');
  if (error.stdout) console.error('STDOUT:\n' + error.stdout.toString());
  if (error.stderr) console.error('STDERR:\n' + error.stderr.toString());
  console.error('STACK:\n' + error.stack);
  process.exit(1);
}