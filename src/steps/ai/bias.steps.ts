import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { withSpan } from '../../utils/traceHelper';
import type { CustomWorld } from '../../support/world';
import type { Span } from '@opentelemetry/api';

// ✅ Bias-simulating ML model
const mockModel = {
  predict: (input: any): number => {
    const { demographic } = input;
    switch (demographic) {
      case 'white':
        return 0.55; // Slightly favored
      case 'black':
        return 0.45; // Slightly disadvantaged
      case 'asian':
        return 0.50;
      case 'hispanic':
        return 0.48;
      case 'nonbinary':
        return 0.50;
      case 'female':
        return 0.52;
      case 'male':
        return 0.50;
      default:
        return 0.50;
    }
  },
};

Given('a model is loaded', function (this: CustomWorld) {
  this.model = mockModel;
});

Given(
  'I input a sample with demographic group {string}',
  function (this: CustomWorld, demographic: string) {
    this.inputSample = {
      demographic,
      attributes: {
        income: 60000,
        age: 35,
      },
    };
  }
);

When("I get the model's decision", async function (this: CustomWorld) {
  await withSpan('model.predict', async (_span: Span) => {
    if (!this.model) {
      throw new Error('Model not available');
    }

    this.modelOutput = this.model.predict(this.inputSample);
  });
});

Then(
  'the decision outcome should be within the fairness threshold',
  async function (this: CustomWorld) {
    const baseline = this.baselineOutput ?? 0.5;
    const actual = this.modelOutput ?? 0;
    const delta = Math.abs(actual - baseline);
    const threshold = 0.06;

    // ✅ Attach diagnostic data to report
    const log = `
      Demographic: ${this.inputSample?.demographic}
      Model Output: ${actual}
      Baseline: ${baseline}
      Delta: ${delta}
      Threshold: ${threshold}
      Result: ${delta <= threshold ? '✅ PASS' : '❌ FAIL'}
    `.trim();

    this.attach(log, 'text/plain');

    expect(delta).toBeLessThanOrEqual(threshold);
  }
);