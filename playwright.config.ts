import { defineConfig } from '@playwright/test';
import { environments } from './src/support/environments';

// Determine the baseURL based on the environment variable ENV, default to 'qa' if not provided
const envKey = process.env.ENV as keyof typeof environments ?? 'qa';
const baseURL = environments[envKey];

// Set Playwright worker count dynamically from an environment variable or default to 2
const workers = process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : 2;

export default defineConfig({
  testDir: './src/tests',
  retries: 1,
  workers: workers,
  timeout: 60000,
  reporter: [
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['json', { outputFile: 'reports/playwright/playwright-report.json' }]
  ],
  use: {
    headless: true,  // Always headless; the `hooks.ts` controls browser mode
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.ENABLE_VIDEO === 'true' ? 'on' : 'off'
  }
});