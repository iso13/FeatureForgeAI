/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import reporter from 'multiple-cucumber-html-reporter';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

reporter.generate({
  jsonDir: path.join(rootDir, 'reports/cucumber'),
  reportPath: path.join(rootDir, 'reports/html'),
  reportName: 'Consolidated Test Report',
  displayDuration: true,
  displayReportTime: true,
  pageTitle: 'FeatureForge AI Test Report',
  pageFooter: '<div>FeatureForge AI — Powered by Cucumber + Playwright</div>',
});

console.log('✅ HTML report generated at reports/html/index.html');