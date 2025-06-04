import { Before, After, BeforeStep, AfterStep, Status, AfterAll, ITestCaseHookParameter } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import * as tracerModule from './tracer';
import * as path from 'path';
import * as fs from 'fs';
import { setDefaultTimeout } from '@cucumber/cucumber';

// Set default timeout
setDefaultTimeout(10_000);

// Access tracing members
const { tracer, shutdownTelemetry } = tracerModule;

// Env controls
const isTracingEnabled = process.env.ENABLE_TRACING === 'true';
const isVerbose = process.env.VERBOSE === 'true';
const isVideoEnabled = process.env.ENABLE_VIDEO === 'true';

if (isVerbose) {
    if (isTracingEnabled) {
        console.log('OpenTelemetry is enabled');
    } else {
        console.log('OpenTelemetry is disabled (ENABLE_TRACING not set to true)');
    }

    if (isVideoEnabled) {
        console.log('Video recording is enabled');
    } else {
        console.log('Video recording is disabled');
    }
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

    if (isVerbose) console.log(`Starting scenario: ${this.scenarioName} (Feature: ${this.featureName})`);

    try {
        const spanName = `Feature: ${this.featureName} - Scenario: ${this.scenarioName}`;
        this.testSpan = tracer.startSpan(spanName);

        this.testSpan.setAttribute('cucumber.feature', this.featureName);
        this.testSpan.setAttribute('cucumber.scenario', this.scenarioName);
        this.testSpan.setAttribute('cucumber.tags', JSON.stringify(scenario.pickle.tags?.map(t => t.name) || []));
        this.testSpan.setAttribute('test.framework', 'cucumber');
        this.testSpan.setAttribute('browser', 'playwright');

        if (isVerbose) console.log('Created OpenTelemetry span for scenario');
    } catch (err) {
        console.warn('Failed to create OpenTelemetry span:', err);
    }

    try {
        if (isVerbose) console.log('Launching browser...');
        const hasNoBrowserTag = scenario.pickle.tags.some(tag => tag.name === '@no-browser');

        const contextOptions = isVideoEnabled
            ? { headless: hasNoBrowserTag, recordVideo: { dir: 'reports/videos' } }
            : { headless: hasNoBrowserTag };

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
        const stepSpanName = `${this.featureName} - ${stepText}`;
        this.stepSpan = tracer.startSpan(stepSpanName, {
            attributes: {
                'cucumber.feature': this.featureName,
                'cucumber.step': stepText,
                'cucumber.scenario': this.scenarioName,
                'test.framework': 'cucumber'
            }
        });
        if (isVerbose) console.log('✓ Created step span');
    } catch (err) {
        console.warn('Failed to create step span:', err);
    }
});

AfterStep(function (this: CustomWorld, step) {
    const stepText = step.pickleStep.text;
    if (isVerbose) console.log(`Completed step: ${stepText}`);

    try {
        if (this.stepSpan) {
            if (step.result?.status === Status.FAILED) {
                this.stepSpan.setAttribute('error', true);
                this.stepSpan.setAttribute('error.message', step.result.message || 'Step failed');
                this.stepSpan.setStatus({ code: 2, message: 'Step Failed' });
            }
            this.stepSpan.end();
            if (isVerbose) console.log('✓ Ended step span');
        }
    } catch (err) {
        console.warn('Failed to end step span:', err);
    }
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (this.page && this.page.video && isVideoEnabled) {
    try {
      console.log('Waiting before closing page to extend video recording...');
      await this.page.waitForTimeout(3000);

      const videoHandle = this.page.video();
      await this.page.close();

      const videoPath = await videoHandle?.path();

      if (videoPath) {
        console.log(`Raw video path: ${videoPath}`);
        const destPath = path.join('reports/videos', path.basename(videoPath));
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(videoPath, destPath);
        console.log(`Video saved to: ${destPath}`);
      } else {
        console.warn('No video path returned');
      }
    } catch (err) {
      console.error('Error retrieving video:', err);
    }
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