import { Given, Then } from '@cucumber/cucumber';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import type { RunnerResult, OutputMode } from 'lighthouse';

let lighthouseReport: any;

Given('I run a Lighthouse audit on {string}', { timeout: 60_000 }, async function (url: string) {
  const lighthouse = (await import('lighthouse')).default;
  const chromeLauncherModule = await import('chrome-launcher');
  const chromeLauncher = chromeLauncherModule.launch;

  const chrome = await chromeLauncher({ chromeFlags: ['--headless'] });

  const options = {
    port: chrome.port,
    output: ['html', 'json'] as unknown as OutputMode[],
  };

  const runnerResult: RunnerResult | undefined = await lighthouse(url, options);

  if (!runnerResult) {
    chrome.kill();
    throw new Error('Lighthouse audit failed and returned undefined');
  }

  lighthouseReport = runnerResult.lhr;

  const [htmlReport, jsonReport] = Array.isArray(runnerResult.report)
    ? runnerResult.report
    : [runnerResult.report];

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(process.cwd(), 'reports', 'lighthouse');
  const htmlPath = path.join(reportDir, `lighthouse-firefly-${timestamp}.html`);
  const jsonPath = path.join(reportDir, `lighthouse-firefly-${timestamp}.json`);

  // Ensure the directory exists
  fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(htmlPath, htmlReport);
  fs.writeFileSync(jsonPath, jsonReport);

  console.log(`Lighthouse HTML report saved to: ${htmlPath}`);
  console.log(`Lighthouse JSON report saved to: ${jsonPath}`);

  chrome.kill();
});

Then('the performance score should be above {int}', function (minScore: number) {
  const score = Math.round(lighthouseReport.categories.performance.score * 100);
  console.log(`📊 Lighthouse Performance Score: ${score}`);
  assert(score >= minScore, `Expected score >= ${minScore}, but got ${score}`);
});