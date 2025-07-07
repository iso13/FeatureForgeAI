/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { IWorldOptions } from '@cucumber/cucumber';
import type {
  Browser,
  BrowserContext,
  Page,
  LaunchOptions,
  BrowserContextOptions,
} from 'playwright';
import type { Span } from '@opentelemetry/api';

import { CapitalCallAgent } from '../ai/agentTester';
import { RAGEngine } from '../ai/ragHelper';
import { BasePage } from '../pages/BasePage';
import { DefaultPage } from '../pages/defaultPage';

// ✅ ML model interface with predict method
export interface MLModel {
  predict: (input: any) => number;
}

export interface CustomWorld extends World {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  basePage: BasePage;
  testSpan?: Span;
  stepSpan?: Span;
  scenarioName: string;
  aiSummary?: string;
  featureName: string;
  pickle: any;
  a11yResults?: any;
  lastSummaryOutput?: string;

  email?: string;
  resetLink?: string;
  newPassword?: string;

  launchBrowser(options?: LaunchOptions & BrowserContextOptions): Promise<void>;

  // Agentic AI fields
  agent?: CapitalCallAgent;
  workflowSteps?: any;
  error?: any;

  // RAG testing fields
  rag?: RAGEngine;
  summary: string;
  retrievedDocs?: any[];
  lastQuery?: string;

  // Agentic test data
  fundAgreements?: any[];
  investors?: any[];
  capitalCalls?: any[];
  notificationLogs?: any[];
  serviceDown?: boolean;

  // Fairness audit fields
  inputSample?: { demographic: string; attributes: { income: number; age: number } };
  modelOutput?: number;
  baselineOutput?: number;
  model?: MLModel;
}

class PlaywrightWorld extends World implements CustomWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  basePage!: BasePage;
  testSpan?: Span;
  stepSpan?: Span;
  scenarioName: string = '';
  featureName: string = '';
  pickle: any;
  a11yResults?: any;
  lastSummaryOutput?: string;

  email: string = '';
  resetLink: string = '';
  newPassword: string = '';

  // Agentic AI fields
  agent?: CapitalCallAgent;
  workflowSteps?: any;
  error?: any;

  // RAG testing fields
  rag?: RAGEngine;
  summary: string = '';
  retrievedDocs?: any[] = [];
  lastQuery?: string;

  // Agentic test data
  fundAgreements?: any[];
  investors?: any[];
  capitalCalls?: any[];
  notificationLogs?: any[];
  serviceDown?: boolean;

  // Fairness audit fields
  inputSample?: { demographic: string; attributes: { income: number; age: number } };
  modelOutput?: number;
  baselineOutput: number = 0.5;
  model?: MLModel;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async launchBrowser(options: LaunchOptions & BrowserContextOptions = {}): Promise<void> {
  try {
    const { chromium } = await import('playwright');

    const headlessEnv = process.env.HEADLESS?.toLowerCase() === 'true';
    const headless = options.headless ?? headlessEnv ?? false;
    const slowMo = options.slowMo ?? 100;

    this.browser = await chromium.launch({ headless, slowMo });
    this.context = await this.browser.newContext(options);
    this.page = await this.context.newPage();
    this.basePage = new DefaultPage(this.page);

    console.log(`✅ Browser launched with headless=${headless}`);
  } catch (error) {
    console.error('❌ Failed to launch browser:', error);
    throw error;
  }
}
}

setWorldConstructor(PlaywrightWorld);