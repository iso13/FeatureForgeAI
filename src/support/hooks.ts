import { Before, After, BeforeStep, AfterStep, Status, AfterAll, ITestCaseHookParameter } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import * as tracerModule from './tracer'; // Import the entire module
import * as path from 'path';

// Access the exported members
const { tracer, shutdownTelemetry } = tracerModule;

console.log('Hooks module loaded, tracer status:', tracer ? 'Available' : 'Not available');

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
    this.pickle = scenario.pickle;
    this.scenarioName = scenario.pickle.name || 'Unknown Scenario';

    // Extract the feature name from the pickle URI
    if (scenario.gherkinDocument?.feature?.name) {
        // If available, use the actual feature name from the Gherkin document
        this.featureName = scenario.gherkinDocument.feature.name;
    } else if (scenario.pickle.uri) {
        // Otherwise extract from the URI
        // Get file name without extension
        const fileName = path.basename(scenario.pickle.uri, '.feature');
        // Convert kebab-case to readable format
        this.featureName = fileName
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    } else {
        this.featureName = 'Unknown Feature';
    }

    console.log(`Starting scenario: ${this.scenarioName} (Feature: ${this.featureName})`);

    try {
        // Create a span with the feature name included
        const spanName = `Feature: ${this.featureName} - Scenario: ${this.scenarioName}`;
        this.testSpan = tracer.startSpan(spanName);

        // Add attributes for filtering
        this.testSpan.setAttribute('cucumber.feature', this.featureName);
        this.testSpan.setAttribute('cucumber.scenario', this.scenarioName);
        this.testSpan.setAttribute('cucumber.tags', JSON.stringify(scenario.pickle.tags?.map(t => t.name) || []));
        this.testSpan.setAttribute('test.framework', 'cucumber');
        this.testSpan.setAttribute('browser', 'playwright');

        console.log('Created OpenTelemetry span for scenario');
    } catch (err) {
        console.warn('Failed to create OpenTelemetry span:', err);
    }

    // Ensure the browser is launched before the test starts
    try {
        console.log('Launching browser...');
        const hasNoBrowserTag = scenario.pickle.tags.some(tag => tag.name === '@no-browser');
        await this.launchBrowser({ headless: hasNoBrowserTag });
        if (!this.page) {
            throw new Error('Page is still undefined after launching browser');
        }
        console.log('Browser and page initialized');
    } catch (error) {
        console.error('Browser initialization failed:', error);
        throw error;
    }
});

// Add step instrumentation
BeforeStep(function (this: CustomWorld, step) {
    const stepText = step.pickleStep.text;
    console.log(`Starting step: ${stepText}`);

    try {
        // Create a span for each step that includes the feature name
        const stepSpanName = `${this.featureName} - ${stepText}`;
        this.stepSpan = tracer.startSpan(stepSpanName, {
            attributes: {
                'cucumber.feature': this.featureName,
                'cucumber.step': stepText,
                'cucumber.scenario': this.scenarioName,
                'test.framework': 'cucumber'
            }
        });
        console.log('✓ Created step span');
    } catch (err) {
        console.warn('Failed to create step span:', err);
    }
});

AfterStep(function (this: CustomWorld, step) {
    const stepText = step.pickleStep.text;
    console.log(`Completed step: ${stepText}`);

    try {
        if (this.stepSpan) {
            // If step failed, add error information
            if (step.result?.status === Status.FAILED) {
                this.stepSpan.setAttribute('error', true);
                this.stepSpan.setAttribute('error.message', step.result.message || 'Step failed');
                this.stepSpan.setStatus({ code: 2, message: 'Step Failed' });
            }

            this.stepSpan.end();
            console.log('✓ Ended step span');
        }
    } catch (err) {
        console.warn('Failed to end step span:', err);
    }
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
    console.log(`Finished scenario: ${this.scenarioName}`);

    try {
        if (scenario.result?.status === Status.FAILED) {
            console.error(`Scenario Failed: ${this.scenarioName}`);

            // Mark OpenTelemetry Span as failed
            if (this.testSpan) {
                this.testSpan.setAttribute('error', true);
                this.testSpan.setAttribute('error.message', scenario.result.exception?.message || 'Unknown error');
                this.testSpan.setStatus({ code: 2, message: 'Test Failed' });
            }
        }

        // End scenario span
        if (this.testSpan) {
            this.testSpan.end();
            console.log('Ended OpenTelemetry span for scenario');
        }

        // Close browser if it exists
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed');
        }

        // Add a small delay to allow pending spans to be exported
        console.log('⏱Waiting for spans to be exported...');
        //await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
        console.warn('Failed to end OpenTelemetry span:', err);
    }
});

// Final hook to ensure all telemetry is flushed and the SDK is shut down
AfterAll(async function () {
    console.log('All tests complete, shutting down OpenTelemetry...');
    try {
        // Add a delay to allow pending spans to be exported
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Then shut down the SDK with timeout
        await shutdownTelemetry();

        // Force exit to ensure the process doesn't hang
        setTimeout(() => {
            console.log('Forcing process to exit');
            process.exit(0);
        }, 1000);
    } catch (err) {
        console.error('Error shutting down OpenTelemetry:', err);
        // Force exit on error
        setTimeout(() => {
            process.exit(1);
        }, 100);
    }
});