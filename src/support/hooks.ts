import { Before, After, BeforeStep, AfterStep, Status, AfterAll } from '@cucumber/cucumber';
import type { ITestCaseHookParameter } from '@cucumber/cucumber';
import type { CustomWorld } from './world';
import * as tracerModule from './tracer';
import * as path from 'path';
import * as fs from 'fs';
import { setDefaultTimeout } from '@cucumber/cucumber';
import { format } from 'date-fns';

setDefaultTimeout(10_000);

const { tracer, shutdownTelemetry } = tracerModule;

const isTracingEnabled = process.env.ENABLE_TRACING === 'true';
const isVerbose = process.env.VERBOSE === 'true';
const isVideoEnabled = process.env.ENABLE_VIDEO === 'true';

if (isVerbose) {
  console.log(`OpenTelemetry is ${isTracingEnabled ? 'enabled' : 'disabled'}`);
  console.log(`Video recording is ${isVideoEnabled ? 'enabled' : 'disabled'}`);
}

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  this.pickle = scenario.pickle;
  this.scenarioName = scenario.pickle.name || 'Unknown Scenario';

  if (scenario.gherkinDocument?.feature?.name) {
    this.featureName = scenario.gherkinDocument.feature.name;
  } else if (scenario.pickle.uri) {
    const fileName = path.basename(scenario.pickle.uri, '.feature');
    this.featureName = fileName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } else {
    this.featureName = 'Unknown Feature';
  }

  const hasNoBrowserTag = scenario.pickle.tags.some(tag => tag.name === '@no-browser');
  if (isVerbose) {
    console.log(`Starting scenario: ${this.scenarioName} (Feature: ${this.featureName})`);
    if (hasNoBrowserTag) console.log('Detected @no-browser tag. Skipping browser launch.');
  }

  try {
    if (isTracingEnabled) {
      const spanName = `Feature: ${this.featureName} - Scenario: ${this.scenarioName}`;
      this.testSpan = tracer.startSpan(spanName);
      this.testSpan.setAttribute('cucumber.feature', this.featureName);
      this.testSpan.setAttribute('cucumber.scenario', this.scenarioName);
      this.testSpan.setAttribute('cucumber.tags', JSON.stringify(scenario.pickle.tags?.map(t => t.name) || []));
      this.testSpan.setAttribute('test.framework', 'cucumber');
      this.testSpan.setAttribute('browser', hasNoBrowserTag ? 'none' : 'playwright');
    }

    if (hasNoBrowserTag) return;

    if (isVerbose) console.log('Launching browser in headed mode...');

    const contextOptions = isVideoEnabled
      ? { headless: false, recordVideo: { dir: 'reports/videos' } }
      : { headless: false };

    await this.launchBrowser(contextOptions);

    if (!this.page) throw new Error('Page is still undefined after launching browser');
    if (isVerbose) console.log('Browser and page initialized');
  } catch (error) {
    console.error('Browser initialization failed:', error);
    throw error;
  }
});

BeforeStep(function (this: CustomWorld, step) {
  const stepText = step.pickleStep.text;
  if (isVerbose) console.log(`Starting step: ${stepText}`);

  try {
    if (isTracingEnabled && tracer) {
      const spanName = `${this.featureName} - ${stepText}`;
      this.stepSpan = tracer.startSpan(spanName, {
        attributes: {
          'cucumber.feature': this.featureName,
          'cucumber.step': stepText,
          'cucumber.scenario': this.scenarioName,
          'test.framework': 'cucumber'
        }
      });
      if (isVerbose) console.log('✓ Created step span');
    }
  } catch (err) {
    console.warn('Failed to create step span:', err);
  }
});

AfterStep(function (this: CustomWorld) {
  try {
    if (isTracingEnabled && this.stepSpan) {
      this.stepSpan.end();
      if (isVerbose) console.log('✓ Step span ended');
    }
  } catch (err) {
    console.warn('Failed to end step span:', err);
  }
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const isFailed = scenario.result?.status === Status.FAILED;
  const hasNoBrowserTag = scenario.pickle.tags.some(tag => tag.name === '@no-browser');

  if (isTracingEnabled && this.testSpan) {
    this.testSpan.setAttribute('test.status', scenario.result?.status || 'unknown');
    this.testSpan.end();
    if (isVerbose) console.log('✓ Test span ended');
  }

  if (isVerbose && hasNoBrowserTag) {
    console.log(`Skipping screenshot and video for @no-browser scenario: ${this.scenarioName}`);
  }

  if (isFailed && this.page && !hasNoBrowserTag) {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const feature = this.featureName?.replace(/\s+/g, '_') || 'UnknownFeature';
    const scenarioName = this.scenarioName?.replace(/\s+/g, '_') || 'UnknownScenario';
    const screenshotName = `${feature}_${scenarioName}_${timestamp}.png`;
    const screenshotPath = path.join('reports/screenshots', screenshotName);

    try {
      await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to: ${screenshotPath}`);

      const imageBuffer = await fs.promises.readFile(screenshotPath);
      const base64Image = imageBuffer.toString('base64');
      this.attach(base64Image, 'image/png');
    } catch (err) {
      console.error('Failed to capture or attach screenshot:', err);
    }
  }

  if (this.page && this.page.video && isVideoEnabled && !hasNoBrowserTag) {
    try {
      console.log('Waiting before closing page to extend video recording...');
      await this.page.waitForTimeout(3000);

      const videoHandle = this.page.video();
      await this.page.close();

      const videoPath = await videoHandle?.path();
      if (videoPath) {
        const destPath = path.join('reports/videos', path.basename(videoPath));
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(videoPath, destPath);
        console.log(`Video saved to: ${destPath}`);
      } else {
        console.warn('No video path returned');
      }
    } catch (err) {
      console.error('Failed to retrieve video:', err);
    }
  }

  // ✅ Ensure proper resource cleanup
  try {
    if (this.page && !hasNoBrowserTag) await this.page.close();
    if (this.context && !hasNoBrowserTag) await this.context.close();
    if (this.browser && !hasNoBrowserTag) await this.browser.close();
    if (isVerbose) console.log('✓ Browser, context, and page closed');
  } catch (err) {
    console.warn('Failed to close browser resources:', err);
  }
});

AfterAll(async function () {
  if (isVerbose) console.log('All tests complete, shutting down OpenTelemetry...');
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await shutdownTelemetry();

    setTimeout(() => {
      if (isVerbose) console.log('Forcing process to exit');
      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error('Error shutting down OpenTelemetry:', err);
    setTimeout(() => process.exit(1), 100);
  }
});
