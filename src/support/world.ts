// src/support/world.ts
import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Page } from 'playwright';
import type { Span } from '@opentelemetry/api';
import type * as tf from '@tensorflow/tfjs-node';

export class CustomWorld extends World {
  page!: Page;
  currentSpan!: Span;

  // ← ADD THESE TWO
  model!: tf.LayersModel;
  prediction?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);