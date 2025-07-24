// src/utils/dom-generator/page-analyzer.ts
/**
 * Handles page analysis and debugging functionality
 * Copyright (c) 2024–2025 David Tran
 */

import type { Page } from 'playwright';
import type { InteractiveElement } from './types.js';

export class PageAnalyzer {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Debug page structure when no interactive elements are found
   */
  async debugPageStructure(): Promise<void> {
    try {
      console.log('🔍 Page Structure Debug:');
      
      // Check basic HTML structure
      const htmlContent = await this.page.content();
      console.log(`   📄 HTML Length: ${htmlContent.length} characters`);
      
      // Check for common framework indicators
      const frameworks = await this.detectFrameworks();
      if (frameworks.length > 0) {
        console.log(`   ⚛️  Detected frameworks: ${frameworks.join(', ')}`);
      }

      // Check for any clickable elements
      const clickableCount = await this.countClickableElements();
      console.log(`   🖱️  Potential clickable elements: ${clickableCount}`);

      // Sample some text content
      const textSample = await this.getTextSample();
      console.log(`   📝 Page text sample: "${textSample}..."`);

      // Check for dynamic content indicators
      const dynamicIndicators = await this.checkDynamicContent();
      if (dynamicIndicators.length > 0) {
        console.log(`   🔄 Dynamic content indicators: ${dynamicIndicators.join(', ')}`);
      }

      // Check page loading state
      const loadingState = await this.checkLoadingState();
      console.log(`   ⏳ Page loading state: ${loadingState}`);

    } catch (error) {
      console.log('   ❌ Debug failed:', error);
    }
  }

  /**
   * Detect JavaScript frameworks on the page
   */
  private async detectFrameworks(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const indicators = [];
      const win = window as any;
      
      // Check for framework globals
      if (win.React) indicators.push('React');
      if (win.Vue) indicators.push('Vue');
      if (win.angular) indicators.push('Angular');
      if (win.ng) indicators.push('Angular');
      
      // Check for framework DOM indicators
      if (document.querySelector('[data-reactroot]')) indicators.push('React (DOM)');
      if (document.querySelector('[data-reactroot], #root, #app')) indicators.push('React App');
      if (document.querySelector('[ng-app], [ng-version]')) indicators.push('Angular (DOM)');
      if (document.querySelector('[data-v-]')) indicators.push('Vue (DOM)');
      if (document.querySelector('[data-svelte]')) indicators.push('Svelte');
      
      // Check for other common frameworks
      if (win.jQuery || win.$) indicators.push('jQuery');
      if (win.Ember) indicators.push('Ember');
      if (win.Backbone) indicators.push('Backbone');
      
      return indicators;
    });
  }

  /**
   * Count potentially clickable elements on the page
   */
  private async countClickableElements(): Promise<number> {
    return await this.page.evaluate(() => {
      const clickable = document.querySelectorAll(
        'button, input, select, textarea, a, [onclick], [role="button"], [tabindex], [data-testid], [data-test]'
      );
      return clickable.length;
    });
  }

  /**
   * Get a sample of page text content
   */
  private async getTextSample(): Promise<string> {
    return await this.page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.slice(0, 200).replace(/\s+/g, ' ').trim();
    });
  }

  /**
   * Check for indicators of dynamic content loading
   */
  private async checkDynamicContent(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const indicators = [];
      
      // Check for loading indicators
      if (document.querySelector('.loading, .spinner, [class*="load"]')) {
        indicators.push('Loading indicators');
      }
      
      // Check for skeleton screens
      if (document.querySelector('[class*="skeleton"], [class*="placeholder"]')) {
        indicators.push('Skeleton screens');
      }
      
      // Check for AJAX/fetch activity indicators
      if (document.querySelector('[class*="ajax"], [data-loading]')) {
        indicators.push('AJAX indicators');
      }
      
      // Check for lazy loading
      if (document.querySelector('[loading="lazy"], [data-lazy]')) {
        indicators.push('Lazy loading');
      }
      
      return indicators;
    });
  }

  /**
   * Check the current page loading state
   */
  private async checkLoadingState(): Promise<string> {
    const readyState = await this.page.evaluate(() => document.readyState);
    const networkState = await this.page.evaluate(() => {
      // Check if there are any pending network requests (basic check)
      const images = Array.from(document.images);
      const pendingImages = images.filter(img => !img.complete);
      return pendingImages.length > 0 ? 'pending-resources' : 'complete';
    });
    
    return `DOM: ${readyState}, Resources: ${networkState}`;
  }

  /**
   * Generate human-readable action text for an element
   */
  generateActionText(element: InteractiveElement): string {
    switch (element.action) {
      case 'click':
        return `the user clicks the "${element.text}"`;
      case 'enter text in':
        return `the user enters text in the "${element.text}"`;
      case 'select option from':
        return `the user selects an option from the "${element.text}"`;
      case 'select':
        return `the user selects the "${element.text}"`;
      default:
        return `the user interacts with the "${element.text}"`;
    }
  }

  /**
   * Analyze page performance and provide recommendations
   */
  async analyzePagePerformance(): Promise<void> {
    try {
      console.log('⚡ Page Performance Analysis:');
      
      // Get performance metrics using modern Navigation Timing API Level 2
      const metrics = await this.page.evaluate(() => {
        const perf = performance;
        const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (!navigation) {
          return {
            domContentLoaded: 0,
            loadComplete: 0,
            domInteractive: 0,
            responseTime: 0,
            firstPaint: 0,
            firstContentfulPaint: 0
          };
        }
        
        return {
          // Modern API uses different timing properties
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          responseTime: navigation.responseEnd - navigation.requestStart,
          firstPaint: perf.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: perf.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      console.log(`   📊 DOM Content Loaded: ${metrics.domContentLoaded}ms`);
      console.log(`   📊 Page Load Complete: ${metrics.loadComplete}ms`);
      console.log(`   📊 DOM Interactive: ${metrics.domInteractive}ms`);
      console.log(`   📊 Response Time: ${metrics.responseTime}ms`);
      
      if (metrics.firstPaint > 0) {
        console.log(`   🎨 First Paint: ${metrics.firstPaint}ms`);
      }
      
      if (metrics.firstContentfulPaint > 0) {
        console.log(`   🎨 First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
      }
      
      // Provide performance recommendations
      this.providePerformanceRecommendations(metrics);
      
    } catch (error) {
      console.log('   ❌ Performance analysis failed:', error);
    }
  }

  /**
   * Provide performance recommendations based on metrics
   */
  private providePerformanceRecommendations(metrics: {
    domContentLoaded: number;
    loadComplete: number;
    domInteractive: number;
    responseTime: number;
    firstPaint: number;
    firstContentfulPaint: number;
  }): void {
    console.log('💡 Performance Recommendations:');
    
    if (metrics.domInteractive > 3000) {
      console.log('   ⚠️  DOM interactive is slow (>3s) - consider reducing DOM complexity');
    }
    
    if (metrics.loadComplete > 5000) {
      console.log('   ⚠️  Page load is slow (>5s) - consider optimizing resources');
    }
    
    if (metrics.firstContentfulPaint > 2500) {
      console.log('   ⚠️  First paint is slow (>2.5s) - consider optimizing critical resources');
    }
    
    if (metrics.responseTime > 1000) {
      console.log('   ⚠️  Server response is slow (>1s) - consider server optimization');
    }
    
    if (metrics.domInteractive < 1000 && metrics.loadComplete < 2000) {
      console.log('   ✅ Page performance looks good!');
    }
  }

  /**
   * Detect accessibility issues on the page
   */
  async checkAccessibility(): Promise<void> {
    try {
      console.log('♿ Accessibility Analysis:');
      
      const a11yIssues = await this.page.evaluate(() => {
        const issues = [];
        
        // Check for images without alt text
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length > 0) {
          issues.push(`${images.length} images missing alt text`);
        }
        
        // Check for form inputs without labels
        const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        let unlabeledInputs = 0;
        inputs.forEach(input => {
          const id = input.getAttribute('id');
          if (!id || !document.querySelector(`label[for="${id}"]`)) {
            unlabeledInputs++;
          }
        });
        if (unlabeledInputs > 0) {
          issues.push(`${unlabeledInputs} form inputs without proper labels`);
        }
        
        // Check for buttons without accessible names
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        const emptyButtons = Array.from(buttons).filter(btn => !btn.textContent?.trim());
        if (emptyButtons.length > 0) {
          issues.push(`${emptyButtons.length} buttons without accessible names`);
        }
        
        // Check for missing main landmark
        const main = document.querySelector('main, [role="main"]');
        if (!main) {
          issues.push('Missing main landmark');
        }
        
        // Check for heading structure
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length === 0) {
          issues.push('No heading structure found');
        }
        
        return issues;
      });
      
      if (a11yIssues.length === 0) {
        console.log('   ✅ No obvious accessibility issues detected');
      } else {
        console.log('   ⚠️  Potential accessibility issues:');
        a11yIssues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }
      
    } catch (error) {
      console.log('   ❌ Accessibility analysis failed:', error);
    }
  }

  /**
   * Get page metadata for better context
   */
  async getPageMetadata(): Promise<{ [key: string]: string }> {
    return await this.page.evaluate(() => {
      const metadata: { [key: string]: string } = {};
      
      // Get meta tags
      const metaTags = document.querySelectorAll('meta[name], meta[property]');
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        const content = tag.getAttribute('content');
        if (name && content) {
          metadata[name] = content;
        }
      });
      
      // Get title
      metadata.title = document.title;
      
      // Get canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        metadata.canonical = canonical.getAttribute('href') || '';
      }
      
      return metadata;
    });
  }
}