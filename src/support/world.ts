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

  constructor(options: IWorldOptions) {
    super(options);
  }

  async launchBrowser(options: LaunchOptions & BrowserContextOptions = {}): Promise<void> {
    const { headless = true, ...contextOptions } = options;

    try {
      const { chromium } = await import('playwright'); // runtime import to avoid ESM issues
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext(contextOptions);
      this.page = await this.context.newPage();
      this.basePage = new DefaultPage(this.page);
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }
}

setWorldConstructor(PlaywrightWorld);