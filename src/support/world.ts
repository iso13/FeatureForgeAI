import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { Span } from '@opentelemetry/api';

export interface CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  testSpan?: Span;
  stepSpan?: Span;
  scenarioName: string;
  featureName: string;
  pickle: any;
  a11yResults?: any;
  launchBrowser(options?: { headless?: boolean }): Promise<void>;
}

class PlaywrightWorld extends World implements CustomWorld {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  testSpan?: Span;
  stepSpan?: Span;
  scenarioName: string;
  featureName: string; // Added property
  pickle: any;
  a11yResults?: any;
  
  constructor(options: IWorldOptions) {
    super(options);
    this.scenarioName = '';
    this.featureName = '';
  }

  async launchBrowser(options: { headless?: boolean } = {}): Promise<void> {
    const headless = options.headless !== undefined ? options.headless : true;

    try {
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      console.log(`✅ Browser launched successfully (headless: ${headless}), page created`);
    } catch (error) {
      console.error('❌ Failed to launch browser:', error);
      throw error;
    }
  }
}

setWorldConstructor(PlaywrightWorld);