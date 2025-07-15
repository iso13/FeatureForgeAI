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

import { MockAccessAPI } from '../mocks/mock-access-api';
import type { AccessAPI } from '../types/access-api';

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
  userId?: string;

  accessApi?: AccessAPI;

  launchBrowser(options?: LaunchOptions & BrowserContextOptions): Promise<void>;

  agent?: CapitalCallAgent;
  workflowSteps?: any;
  error?: any;

  rag?: RAGEngine;
  summary?: string;
  retrievedDocs?: any[];
  lastQuery?: string;

  fundAgreements?: any[];
  investors?: any[];
  capitalCalls?: any[];
  notificationLogs?: any[];
  serviceDown?: boolean;

  inputSample?: { demographic: string; attributes: { income: number; age: number } };
  modelOutput?: number;
  baselineOutput?: number;
  model?: MLModel;

  audioStream?: any;
  emr?: {
    status?: string;
    storeVisitSummary: (summary: any) => Promise<{ success: boolean }>;
  };
  healthAgent?: {
    transcribe: (stream: any) => Promise<string>;
    extractClinicalData: (summary: string) => Promise<any>;
    tagICD10: (data: any) => Promise<any>;
  };
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
  userId?: string;
  accessApi?: AccessAPI;

  agent?: CapitalCallAgent;
  workflowSteps?: any;
  error?: any;

  rag?: RAGEngine;
  summary?: string;
  retrievedDocs?: any[] = [];
  lastQuery?: string;

  fundAgreements?: any[];
  investors?: any[];
  capitalCalls?: any[];
  notificationLogs?: any[];
  serviceDown?: boolean;

  inputSample?: { demographic: string; attributes: { income: number; age: number } };
  modelOutput?: number;
  baselineOutput: number = 0.5;
  model?: MLModel;

  audioStream?: any;
  emr?: {
    status?: string;
    storeVisitSummary: (summary: any) => Promise<{ success: boolean }>;
  };
  healthAgent?: {
    transcribe: (stream: any) => Promise<string>;
    extractClinicalData: (summary: string) => Promise<any>;
    tagICD10: (data: any) => Promise<any>;
  };

  constructor(options: IWorldOptions) {
    super(options);
    this.accessApi = new MockAccessAPI();
  }

  async launchBrowser(options: LaunchOptions & BrowserContextOptions = {}): Promise<void> {
    const { chromium } = await import('playwright');
    const headlessEnv = process.env.HEADLESS?.toLowerCase() === 'true';
    const headless = options.headless ?? headlessEnv ?? false;
    const slowMo = options.slowMo ?? 100;

    this.browser = await chromium.launch({ headless, slowMo });
    this.context = await this.browser.newContext(options);
    this.page = await this.context.newPage();
    this.basePage = new DefaultPage(this.page);

    console.log(`Browser launched with headless=${headless}`);
  }
}

setWorldConstructor(PlaywrightWorld);