// src/support/hooks.ts
import {
  BeforeAll,
  Before,
  BeforeStep,
  After,
  AfterAll,
  setDefaultTimeout,
  Status,
} from '@cucumber/cucumber';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { tracer } from './telemetry';
import { fixture } from './pageFixture';
import { CustomWorld } from './world';

// TensorFlow.js import
import * as tf from '@tensorflow/tfjs-node';

setDefaultTimeout(10 * 1000);

let suiteCtx = context.active();

// Run once before any scenarios
BeforeAll(async function () {
  // Start our suite span
  suiteCtx = trace.setSpan(
    context.active(),
    tracer.startSpan('Test Suite')
  );
  await fixture.initialize();
});

// For any scenario tagged with @verifyTrainedModel, train the model in memory
Before({ tags: '@verifyTrainedModel' }, async function (this: CustomWorld) {
  // Build a simple linear regression y = 2x - 1
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 1, inputShape: [1], activation: 'linear' })
  );
  model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

  // Training data: x ⇒ y = 2x -1
  const xs = tf.tensor1d([0, 1, 2, 3, 4]);
  const ys = tf.tensor1d([-1, 1, 3, 5, 7]);

  // Train without saving to disk
  await model.fit(xs, ys, { epochs: 100 });

  // Expose on the world for your steps
  this.model = model;
});

// Before each scenario: start a span and spin up a fresh browser context/page
Before(async function (this: CustomWorld, { pickle }) {
  const span = tracer.startSpan(`Scenario: ${pickle.name}`, {}, suiteCtx);
  this.currentSpan = span;
  suiteCtx = trace.setSpan(suiteCtx, span);

  await fixture.initialize();
  this.page = fixture.page!;
});

// After each scenario: end the span, close context/page
After(async function (this: CustomWorld, { result }) {
  if (this.currentSpan) {
    this.currentSpan.setStatus({
      code:
        result?.status === Status.PASSED
          ? SpanStatusCode.OK
          : SpanStatusCode.ERROR,
    });
    this.currentSpan.end();
  }

  if (fixture.context) {
    await fixture.context.close();
    fixture.context = undefined;
    fixture.page = undefined;
  }
});

// After all scenarios: end suite span and close browser
AfterAll(async function () {
  const suiteSpan = trace.getSpan(suiteCtx);
  suiteSpan?.end();

  await fixture.close();
});