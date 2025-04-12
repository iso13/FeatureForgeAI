// cucumber.mjs
import isCI from 'is-ci';

const config = {
  // Where to find your .feature files
  paths: [process.env.FEATURE_PATH || 'src/features/**/*.feature'],

  // Use ts-node to run TypeScript support files
  requireModule: ['ts-node/register'],

  // Load order matters!
  require: [
    // 1) Start OpenTelemetry as early as possible
    'src/support/telemetry.ts',

    // 2) Your custom Cucumber world (attach, page, etc.)
    'src/support/world.ts',

    // 3) Playwright fixture (browser/context/page)
    'src/support/pageFixture.ts',

    // 4) Cucumber hooks (Before, After, etc.)
    'src/support/hooks.ts',

    // 5) Finally, your step definitions
    process.env.STEP_PATH || 'src/steps/**/*.steps.ts',
  ],

  strict: true,

  // Reports: console progress + JSON + HTML
  format: [
    'progress',
    'json:reports/cucumber_report.json',
    'html:reports/report.html',
  ],
  formatOptions: { snippetInterface: 'async-await' },

  worldParameters: {},

  // Retry once on CI to mitigate flakiness
  retry: isCI ? 1 : 0,
};

export default config;