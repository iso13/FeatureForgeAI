// src/support/hooks.ts
import {
  BeforeAll,
  Before,
  After,
  AfterAll,
  setDefaultTimeout,
  Status,
} from '@cucumber/cucumber';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { tracer } from './telemetry';
import { fixture } from './pageFixture';
import { CustomWorld } from './world';

setDefaultTimeout(10 * 1000);

let suiteCtx = context.active();

BeforeAll(async () => {
  suiteCtx = trace.setSpan(context.active(), tracer.startSpan('Test Suite'));
  await fixture.initialize();
});

Before(async function (this: CustomWorld, { pickle }) {
  const span = tracer.startSpan(`Scenario: ${pickle.name}`, {}, suiteCtx);
  this.currentSpan = span;
  suiteCtx = trace.setSpan(suiteCtx, span);
  await fixture.initialize();
  this.page = fixture.page!;
});

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

AfterAll(async () => {
  const suiteSpan = trace.getSpan(suiteCtx);
  suiteSpan?.end();
  await fixture.close();
});