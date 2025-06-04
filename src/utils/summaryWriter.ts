//src/utils/summaryWriter.ts
import fs from 'fs';
import path from 'path';
import { Span } from '@opentelemetry/api';
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