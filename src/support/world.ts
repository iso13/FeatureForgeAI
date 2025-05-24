import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { Span } from '@opentelemetry/api';
import { CapitalCallAgent } from '../ai/agentTester';
import { RAGEngine } from '../ai/ragHelper';

export interface CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  testSpan?: Span;
  stepSpan?: Span;
  scenarioName: string;
  aiSummary?: string;
  featureName: string;
  pickle: any;
  a11yResults?: any;
  lastSummaryOutput?: string;
  launchBrowser(options?: { headless?: boolean }): Promise<void>;

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
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  testSpan?: Span;
  stepSpan?: Span;
  scenarioName: string = '';
  featureName: string = '';
  pickle: any;
  a11yResults?: any;

  // Agentic AI
  agent?: CapitalCallAgent;
  workflowSteps?: any;
  error?: any;

  // RAG
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

  async launchBrowser(options: { headless?: boolean } = {}): Promise<void> {
    const headless = options.headless ?? true;

    try {
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      console.log(`Browser launched successfully (headless: ${headless}), page created`);
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }
}

setWorldConstructor(PlaywrightWorld);