// src/utils/dom-generator/index.ts
/**
 * Main DOM Generator - Orchestrates all modules
 * Copyright (c) 2024–2025 David Tran
 */

import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { ElementExtractor } from './element-extractor.js';
import { FeatureGenerator } from './feature-generator.js';
import { StepGenerator } from './step-generator.js';
import { PageAnalyzer } from './page-analyzer.js';
import type { AnalysisResult } from './types.js';

export class DOMGenerator {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async analyzePage(url: string): Promise<AnalysisResult> {
    this.browser = await chromium.launch({ 
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    this.page = await this.browser.newPage();

    try {
      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for React/dynamic content to load
      console.log('⏳ Waiting for dynamic content...');
      await this.page.waitForTimeout(8000);
      
      // Try to wait for common React/app indicators
      try {
        await this.page.waitForSelector('div[id="root"], div[id="app"], main, [data-testid], button, input, textarea, select, .playground', { timeout: 10000 });
      } catch (e) {
        console.log('⚠️  Standard selectors not found, continuing with full page analysis...');
      }

      const title = await this.page.title();
      console.log(`📄 Analyzing page: ${title}`);

      // Check if page loaded properly
      const bodyText = await this.page.textContent('body');
      if (bodyText?.includes('You need JavaScript') || (bodyText?.trim().length || 0) < 50) {
        console.log('⚠️  Page appears to need JavaScript or has minimal content');
        // Try to wait longer for JavaScript to execute
        await this.page.waitForTimeout(10000);
      }

      // Get interactive elements using ElementExtractor
      const extractor = new ElementExtractor(this.page);
      const elements = await extractor.extractInteractiveElements();
      
      console.log(`🔍 Found ${elements.length} interactive elements`);
      
      // Debug page structure if no elements found
      if (elements.length === 0) {
        console.log('⚠️  No interactive elements found. Analyzing page structure...');
        const analyzer = new PageAnalyzer(this.page);
        await analyzer.debugPageStructure();
      }

      // Calculate counts for backward compatibility
      const buttonCount = elements.filter(el => 
        el.type === 'button' || 
        el.action === 'click' || 
        el.text.toLowerCase().includes('button') ||
        el.role === 'button'
      ).length;
      
      const inputCount = elements.filter(el => 
        ['input', 'textarea'].includes(el.type) ||
        el.action === 'enter text in' ||
        el.role === 'textbox'
      ).length;
      
      const linkCount = elements.filter(el => 
        el.type === 'a' ||
        el.role === 'link'
      ).length;

      // Generate actions using PageAnalyzer
      const analyzer = new PageAnalyzer(this.page);
      const actions = elements.map(el => analyzer.generateActionText(el));

      return {
        title,
        elements,
        url,
        buttonCount,
        inputCount,
        linkCount,
        actions
      };
    } catch (error) {
      console.error('❌ Failed to analyze page:', error);
      throw error;
    }
  }

  generateFeature(analysis: AnalysisResult, featureName: string): string {
    const generator = new FeatureGenerator();
    return generator.generateFeature(analysis, featureName);
  }

  generateStepDefinitions(analysis: AnalysisResult, featureName: string): string {
    const generator = new StepGenerator();
    return generator.generateStepDefinitions(analysis, featureName);
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// Re-export types for external use
export type { InteractiveElement, AnalysisResult } from './types.js';