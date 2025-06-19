import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import {
  Browser,
  BrowserContext,
  Page,
  chromium,
  LaunchOptions,
  BrowserContextOptions,
} from 'playwright';
import { Span } from '@opentelemetry/api';
import { CapitalCallAgent } from '../ai/agentTester';
import { RAGEngine } from '../ai/ragHelper';
import { BasePage } from '../pages/basePage';
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
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext(contextOptions);
      this.page = await this.context.newPage();

      // Initialize basePage using DefaultPage wrapper
      this.basePage = new DefaultPage(this.page);
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }
}

setWorldConstructor(PlaywrightWorld);