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
  featureName: string; // Added property for feature name
  pickle: any;
  a11yResults?: any; // Using 'any' type for accessibility results
  launchBrowser(): Promise<void>;
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

  async launchBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      console.log('✅ Browser launched successfully, page created');
    } catch (error) {
      console.error('❌ Failed to launch browser:', error);
      throw error;
    }
  }
}

setWorldConstructor(PlaywrightWorld);