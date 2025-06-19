import isCI from 'is-ci';

export default {
  paths: [process.env.FEATURE_PATH || 'src/features/**/*.feature'],
  import: [
    'src/support/tracer.ts',
    'src/support/world.ts',
    'src/support/hooks.ts',
    process.env.STEP_PATH || 'src/steps/**/*.steps.ts'
  ],

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
