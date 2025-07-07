/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

//src/utils/summaryWriter.ts
import fs from 'fs';
import path from 'path';
import type { Span } from '@opentelemetry/api';
import { withSpan } from './traceHelper';

/**
 * Writes the given summary to a file in /reports/summaries directory.
 * The filename is derived from the scenario name.
 */
export async function writeSummaryToFile(summary: string, scenarioName: string, parentSpan?: Span): Promise<void> {
  const sanitized = scenarioName.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
  const outPath = path.join('reports', 'summaries', `${sanitized}.txt`);

  return withSpan('writeSummaryToFile', async (span) => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, summary);
    span.setAttribute('filePath', outPath);
    span.setAttribute('summaryLength', summary.length);
  }, { scenarioName }, parentSpan);
}