import isCI from 'is-ci';

export default {
  // Load tsx first — this makes Node able to run .ts files
  import: [
    'tsx',
    'src/core/support/tracer.ts',
    'src/core/support/world.ts',
    'src/core/support/hooks.ts',
    process.env.STEP_PATH || 'src/steps/**/*.steps.ts'
  ],

  paths: [process.env.FEATURE_PATH || 'src/features/**/*.feature'],

  format: [
    'progress',
    'json:reports/cucumber/cucumber_report.json',
    'html:reports/cucumber/cucumber_report.html',
    'junit:reports/cucumber/cucumber_report.xml'
  ],

  formatOptions: { snippetInterface: 'async-await' },
  retry: process.env.RETRY || (isCI ? 1 : 0),
  parallel: process.env.PARALLEL || 1,
  tags: process.env.TAGS || ''
};