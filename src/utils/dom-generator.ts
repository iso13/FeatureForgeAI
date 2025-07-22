// src/utils/dom-generator.ts
/**
 * FeatureForge AI - Enhanced DOM Generator
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

interface InteractiveElement {
  selector: string;
  type: string;
  text: string;
  action: string;
  testId?: string;
  role?: string;
}

export class DOMGenerator {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async analyzePage(url: string) {
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
      await this.page.waitForTimeout(8000); // Increased wait time
      
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

      // Get interactive elements using multiple strategies
      const elements = await this.extractInteractiveElements();
      
      console.log(`🔍 Found ${elements.length} interactive elements`);
      
      if (elements.length === 0) {
        console.log('⚠️  No interactive elements found. Analyzing page structure...');
        await this.debugPageStructure();
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

      // Generate actions for backward compatibility
      const actions = elements.map(el => this.generateActionText(el));

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

  private async debugPageStructure() {
    if (!this.page) return;

    try {
      console.log('🔍 Page Structure Debug:');
      
      // Check basic HTML structure
      const htmlContent = await this.page.content();
      console.log(`   📄 HTML Length: ${htmlContent.length} characters`);
      
      // Check for common framework indicators
      const frameworks = await this.page.evaluate(() => {
        const indicators = [];
        const win = window as any; // Type assertion to avoid TS errors
        
        if (win.React) indicators.push('React');
        if (win.Vue) indicators.push('Vue');
        if (win.angular) indicators.push('Angular');
        if (win.ng) indicators.push('Angular');
        if (document.querySelector('[data-reactroot]')) indicators.push('React (DOM)');
        if (document.querySelector('[data-reactroot], #root, #app')) indicators.push('React App');
        if (document.querySelector('[ng-app], [ng-version]')) indicators.push('Angular (DOM)');
        if (document.querySelector('[data-v-]')) indicators.push('Vue (DOM)');
        
        return indicators;
      });
      
      if (frameworks.length > 0) {
        console.log(`   ⚛️  Detected frameworks: ${frameworks.join(', ')}`);
      }

      // Check for any clickable elements
      const clickableCount = await this.page.evaluate(() => {
        const clickable = document.querySelectorAll('button, input, select, textarea, a, [onclick], [role="button"], [tabindex]');
        return clickable.length;
      });
      console.log(`   🖱️  Potential clickable elements: ${clickableCount}`);

      // Sample some text content
      const textSample = await this.page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.slice(0, 200).replace(/\s+/g, ' ').trim();
      });
      console.log(`   📝 Page text sample: "${textSample}..."`);

    } catch (error) {
      console.log('   ❌ Debug failed:', error);
    }
  }

  private async extractInteractiveElements(): Promise<InteractiveElement[]> {
    if (!this.page) throw new Error('Page not initialized');

    // First, take a screenshot for debugging
    console.log('📸 Taking page screenshot...');
    try {
      await this.page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      console.log('   Screenshot saved as debug-screenshot.png');
    } catch (error) {
      console.log('   Screenshot failed:', error);
    }

    // Extract interactive elements using comprehensive selectors
    const elementsData = await this.page.evaluate(() => {
      const elements: InteractiveElement[] = [];
      
      // Enhanced selectors for modern web apps - especially for Testing Playground
      const selectors = [
        // Test attributes (highest priority)
        '[data-testid]',
        '[data-test]',
        '[data-cy]',
        '[test-id]',
        '[data-qa]',
        // Semantic HTML
        'button',
        'input',
        'textarea',
        'select',
        'a[href]',
        // ARIA roles
        '[role="button"]',
        '[role="textbox"]',
        '[role="combobox"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[role="tabpanel"]',
        // Interactive patterns
        '[onclick]',
        '[onsubmit]',
        '[tabindex]',
        // Class-based (common patterns)
        '.btn',
        '.button',
        '.link',
        '.input',
        '.form-control',
        '.field',
        // React/Vue common patterns
        '[class*="button"]',
        '[class*="btn"]',
        '[class*="input"]',
        '[class*="field"]',
        '[class*="control"]',
        '[class*="editor"]',
        '[class*="playground"]',
        // Form elements specifically
        'form input',
        'form button',
        'form select',
        'form textarea',
        // Modern CSS patterns
        '[type="submit"]',
        '[type="button"]',
        '[type="text"]',
        '[type="email"]',
        '[type="password"]',
        '[type="search"]',
        // Testing Playground specific
        '.CodeMirror',
        '[contenteditable]',
        '.cm-editor',
        // Generic interactive
        '[class*="interactive"]',
        '[class*="clickable"]',
        '[style*="cursor: pointer"]'
      ];

      const processedElements = new Set<string>();
      let elementId = 0;

      selectors.forEach(selector => {
        try {
          const elements_found = document.querySelectorAll(selector);
          
          elements_found.forEach((el) => {
            const element = el as HTMLElement;
            
            // Skip hidden or tiny elements
            const rect = element.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return;
            
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            // Create unique identifier for deduplication
            const uniqueId = `${selector}-${rect.top.toFixed(0)}-${rect.left.toFixed(0)}-${rect.width.toFixed(0)}`;
            if (processedElements.has(uniqueId)) return;
            processedElements.add(uniqueId);

            // Get element properties
            const tagName = element.tagName.toLowerCase();
            const testId = element.getAttribute('data-testid') || 
                          element.getAttribute('data-test') || 
                          element.getAttribute('data-cy') ||
                          element.getAttribute('test-id') ||
                          element.getAttribute('data-qa') ||
                          undefined;
            
            const role = element.getAttribute('role') || element.getAttribute('aria-label') || undefined;
            const type = (element as HTMLInputElement).type || tagName;
            const id = element.id;
            const className = element.className;
            
            // Get meaningful text with multiple fallbacks
            let text = element.getAttribute('aria-label') ||
                      element.getAttribute('title') ||
                      element.getAttribute('alt') ||
                      element.getAttribute('placeholder') ||
                      (element as HTMLInputElement).value ||
                      (element.textContent?.trim() || '') ||
                      '';

            // Clean and limit text length
            text = (text || '').replace(/\s+/g, ' ').slice(0, 60).trim();
            
            // Generate priority-based selector
            let selector_final = '';
            if (testId) {
              const attr = element.hasAttribute('data-testid') ? 'data-testid' : 
                          element.hasAttribute('data-test') ? 'data-test' : 
                          element.hasAttribute('data-cy') ? 'data-cy' : 'test-id';
              selector_final = `[${attr}="${testId}"]`;
            } else if (id) {
              selector_final = `#${id}`;
            } else if (role) {
              selector_final = `[role="${role}"]`;
            } else if (className && className.split(' ').length <= 3) {
              const classes = className.split(' ').filter(c => c.length > 2).slice(0, 2);
              if (classes.length > 0) {
                selector_final = `.${classes.join('.')}`;
              }
            } else {
              selector_final = tagName;
            }

            // Determine action type based on element characteristics
            let action = 'interact with';
            
            if (tagName === 'button' || type === 'submit' || type === 'button' || role === 'button') {
              action = 'click';
            } else if (tagName === 'a' && element.hasAttribute('href')) {
              action = 'click';
            } else if (['input', 'textarea'].includes(tagName) && !['checkbox', 'radio', 'submit', 'button'].includes(type)) {
              action = 'enter text in';
            } else if (tagName === 'select' || role === 'combobox') {
              action = 'select option from';
            } else if (type === 'checkbox' || type === 'radio') {
              action = 'select';
            } else if (element.hasAttribute('onclick') || style.cursor === 'pointer') {
              action = 'click';
            } else if (element.hasAttribute('contenteditable') || className.includes('editor')) {
              action = 'enter text in';
            }

            // Use element text or generate descriptive name
            let finalText = text || testId || id || '';
            
            // Special naming for Testing Playground elements
            if (className.includes('CodeMirror') || className.includes('cm-editor')) {
              finalText = 'code editor';
            } else if (className.includes('playground')) {
              finalText = 'playground area';
            } else if (!finalText) {
              finalText = `${tagName} element ${++elementId}`;
            }

            elements.push({
              selector: selector_final,
              type: tagName,
              text: finalText,
              action,
              testId,
              role
            });
          });
        } catch (e) {
          // Skip selectors that cause errors
          console.warn(`Selector "${selector}" caused error:`, e);
        }
      });

      return elements;
    });

    // Sort elements by priority and filter
    const sortedElements = elementsData
      .filter(el => el.text.length > 0)
      .sort((a, b) => {
        // Priority: testId > button > input > others
        if (a.testId && !b.testId) return -1;
        if (!a.testId && b.testId) return 1;
        if (a.type === 'button' && b.type !== 'button') return -1;
        if (a.type !== 'button' && b.type === 'button') return 1;
        if (a.action === 'click' && b.action !== 'click') return -1;
        if (a.action !== 'click' && b.action === 'click') return 1;
        return 0;
      })
      .slice(0, 20); // Increased limit for better coverage

    console.log('🎯 Element extraction details:');
    sortedElements.forEach((el, i) => {
      console.log(`   ${i + 1}. ${el.type.toUpperCase()}: "${el.text}" (${el.action}) - ${el.selector}`);
    });

    return sortedElements;
  }

  private generateActionText(element: InteractiveElement): string {
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

  generateFeature(analysis: any, featureName: string): string {
    console.log('🚀🚀🚀 ENHANCED GENERATEFEATURE CALLED with elements:', analysis.elements?.length);
  console.log('🚀🚀🚀 Analysis object keys:', Object.keys(analysis));
    const tag = `@${featureName.replace(/\s+/g, '').toLowerCase()}`;
    const isTestingPlayground = analysis.url?.includes('testing-playground.com');
    
    console.log('🚀 ENHANCED GENERATOR ACTIVE! Elements found:', analysis.elements?.length || 0);
    
    if (!analysis.elements || analysis.elements.length === 0) {
      // Generate a fallback feature for JavaScript-heavy sites
      return `${tag}
Feature: ${featureName}
As a developer, I want to test ${analysis.title} functionality so that I can ensure the application works correctly

Background:
  Given I am on the "${analysis.title}" page
  And the page has loaded completely

Scenario: Page loads successfully
  When I navigate to the application
  Then the page should display the main interface
  And all dynamic content should be loaded

Scenario: Application is interactive
  When the page finishes loading
  Then I should be able to interact with the interface
  And the application should respond to user actions

Scenario: Basic functionality works
  When I interact with page elements
  Then the system should respond appropriately
  And no errors should occur

# Note: This is a JavaScript-heavy application
# Manual analysis may be required to identify specific test scenarios
# Consider adding data-testid attributes to elements for better testing`;
    }

    // Special handling for testing-playground.com
    if (isTestingPlayground) {
      return this.generateTestingPlaygroundFeature(analysis, featureName, tag);
    }

    // Group elements by type for better scenario organization
    const buttons = analysis.elements.filter((el: InteractiveElement) => 
      el.type === 'button' || el.action === 'click' || el.text.toLowerCase().includes('button'));
    const inputs = analysis.elements.filter((el: InteractiveElement) => 
      el.action === 'enter text in' || el.type === 'input' || el.type === 'textarea');
    const selects = analysis.elements.filter((el: InteractiveElement) => 
      el.action === 'select option from' || el.action === 'select' || el.type === 'select');

    let scenarios = [];

    // Generate comprehensive scenarios based on found elements
    if (buttons.length > 0) {
      const primaryButtons = buttons.slice(0, 3);
      const buttonSteps = primaryButtons.map((btn: InteractiveElement) => 
        `When I click the "${this.getElementName(btn)}"`
      );
      
      scenarios.push(`Scenario: Interact with primary interface elements
${buttonSteps.map((step: string) => `  ${step}`).join('\n')}
  Then the system should respond appropriately
  And the interface should update accordingly`);
    }

    if (inputs.length > 0) {
      const formSteps = inputs.slice(0, 3).map((input: InteractiveElement) => 
        `When I provide "valid data" in the "${this.getElementName(input)}"`
      );
      
      if (buttons.length > 0) {
        const submitButton = buttons.find((b: InteractiveElement) => 
          b.text.toLowerCase().includes('submit') || 
          b.text.toLowerCase().includes('save') ||
          b.text.toLowerCase().includes('send')
        ) || buttons[0];
        formSteps.push(`When I click the "${this.getElementName(submitButton)}"`);
      }

      scenarios.push(`Scenario: Complete form data entry
${formSteps.map((step: string) => `  ${step}`).join('\n')}
  Then the form should be processed successfully
  And I should receive confirmation`);
    }

    // Add validation scenario if we have inputs
    if (inputs.length > 0) {
      scenarios.push(`Scenario: Handle invalid input data
  When I provide "invalid data" in form fields
  And I attempt to submit the form
  Then I should see validation error messages
  And the form should not be submitted`);
    }

    // Add navigation scenario if we have links
    const links = analysis.elements.filter((el: InteractiveElement) => el.type === 'a' || el.action === 'click');
    if (links.length > 1) {
      scenarios.push(`Scenario: Navigate through application sections
  When I click navigation elements
  Then I should be able to access different sections
  And the application should maintain proper state`);
    }

    // If no specific scenarios were created, create a general interaction scenario
    if (scenarios.length === 0 && analysis.elements.length > 0) {
      const topElements = analysis.elements.slice(0, 3);
      const generalSteps = topElements.map((el: InteractiveElement) => 
        `When I ${el.action} the "${el.text}"`
      );
      
      scenarios.push(`Scenario: General page interaction
${generalSteps.map((step: string) => `  ${step}`).join('\n')}
  Then the page should respond to user interactions
  And the interface should remain functional`);
    }

    return `${tag}
Feature: ${featureName}
As a user, I want to interact with ${analysis.title} so that I can accomplish my goals effectively

Background:
  Given I am on the "${analysis.title}" page
  And the page interface is fully loaded

${scenarios.join('\n\n')}`;
  }

  private generateTestingPlaygroundFeature(analysis: any, featureName: string, tag: string): string {
    return `${tag}
Feature: ${featureName}
As a developer, I want to validate Testing Playground functionality so that I can learn effective testing practices

Background:
  Given I am on the "Testing Playground" page
  And the application has loaded completely

Scenario: Playground interface is accessible
  When I load the Testing Playground
  Then I should see the HTML editor panel
  And I should see the query selector panel
  And the interface should be ready for interaction

Scenario: HTML markup can be edited
  When I enter sample HTML markup in the editor
  Then the markup should be accepted
  And the DOM should update accordingly
  And query suggestions should be generated

Scenario: Query selector testing works
  When I provide HTML markup with test elements
  And I try different query selectors
  Then I should see which selectors work
  And I should receive feedback on best practices
  And the playground should highlight accessible queries

Scenario: Element selection provides recommendations
  When I select an element in the rendered output
  Then I should see recommended query methods
  And the playground should explain why certain queries are better
  And I should see accessibility considerations

Scenario: Invalid queries show helpful errors
  When I enter invalid or inefficient queries
  Then I should see clear error messages
  And the playground should suggest corrections
  And I should learn better testing practices

# Note: This is a React-based testing tool for learning DOM query best practices`;
  }

  private getElementName(element: InteractiveElement): string {
    if (element.testId) {
      return element.testId.replace(/[-_]/g, ' ');
    }
    
    if (element.text && element.text.length > 0 && element.text !== `${element.type} element`) {
      return element.text.toLowerCase();
    }
    
    return `${element.type} element`;
  }

  generateStepDefinitions(analysis: any, featureName: string): string {
    const steps = new Set<string>();
    
    // Add standard navigation steps
    steps.add(`Given('I am on the {string} page', async function (this: CustomWorld, pageName: string) {
  try {
    await this.page.goto(this.baseURL);
    await this.page.waitForLoadState('networkidle');
    const title = await this.page.title();
    expect(title).toContain(pageName);
  } catch (error) {
    throw new Error(\`Failed to navigate to \${pageName} page: \${error}\`);
  }
});`);

    // Generate steps for each unique action type
    if (analysis.elements && analysis.elements.some((el: InteractiveElement) => el.action === 'click')) {
      steps.add(`When('I click the {string}', async function (this: CustomWorld, elementName: string) {
  try {
    const selector = this.getElementSelector(elementName);
    await this.page.click(selector);
    await this.page.waitForLoadState('networkidle');
  } catch (error) {
    throw new Error(\`Failed to click \${elementName}: \${error}\`);
  }
});`);
    }

    if (analysis.elements && analysis.elements.some((el: InteractiveElement) => el.action === 'enter text in')) {
      steps.add(`When('I enter {string} in the {string}', async function (this: CustomWorld, text: string, fieldName: string) {
  try {
    const selector = this.getElementSelector(fieldName);
    await this.page.fill(selector, text);
  } catch (error) {
    throw new Error(\`Failed to enter text in \${fieldName}: \${error}\`);
  }
});

When('I provide {string} data in the {string}', async function (this: CustomWorld, dataType: string, fieldName: string) {
  try {
    const testData = this.getTestData(dataType);
    const selector = this.getElementSelector(fieldName);
    await this.page.fill(selector, testData);
  } catch (error) {
    throw new Error(\`Failed to provide \${dataType} data in \${fieldName}: \${error}\`);
  }
});`);
    }

    // Add verification steps
    steps.add(`Then('the system should respond appropriately', async function (this: CustomWorld) {
  try {
    // Wait for any async operations to complete
    await this.page.waitForTimeout(1000);
    
    // Check that we're still on a valid page (not error page)
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('error');
  } catch (error) {
    throw new Error(\`System did not respond appropriately: \${error}\`);
  }
});

Then('the page should load successfully', async function (this: CustomWorld) {
  try {
    await this.page.waitForLoadState('networkidle');
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
  } catch (error) {
    throw new Error(\`Page did not load successfully: \${error}\`);
  }
});`);

    return `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

${Array.from(steps).join('\n\n')}`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}