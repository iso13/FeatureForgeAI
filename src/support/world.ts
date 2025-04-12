// src/support/world.ts
import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import { Page } from 'playwright';
import { Span } from '@opentelemetry/api';

export class CustomWorld extends World {
  // your page handle
  page?: Page;

  // will hold the span for each scenario
  currentSpan?: Span;

  constructor(options: IWorldOptions) {
    // World constructor wires up `attach` and `parameters`
    super(options);
  }
}

setWorldConstructor(CustomWorld);