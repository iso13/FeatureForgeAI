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
  testId?: string | undefined;
  role?: string | undefined;
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
      
      // Priority selectors - most specific first
      const prioritySelectors = [
        // Test attributes (highest priority)
        '[data-testid]',
        '[data-test]',
        '[data-cy]',
        '[test-id]',
        '[data-qa]'
      ];

      const standardSelectors = [
        // Semantic HTML
        'button',
        'input[type="text"]',
        'input[type="email"]', 
        'input[type="password"]',
        'input[type="search"]',
        'input[type="submit"]',
        'input[type="button"]',
        'textarea',
        'select',
        'a[href]'
      ];

      const processedTestIds = new Set<string>();
      const processedElements = new Set<string>();

      // Process priority selectors first (test attributes)
      prioritySelectors.forEach(selector => {
        try {
          const elements_found = document.querySelectorAll(selector);
          
          elements_found.forEach((el) => {
            const element = el as HTMLElement;
            
            // Skip hidden or tiny elements
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return;
            
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            // Get test ID
            const testId = element.getAttribute('data-testid') || 
                          element.getAttribute('data-test') || 
                          element.getAttribute('data-cy') ||
                          element.getAttribute('test-id') ||
                          element.getAttribute('data-qa') ||
                          undefined;

            // Skip if we already processed this test ID
            if (testId && processedTestIds.has(testId)) return;
            if (testId) processedTestIds.add(testId);

            // Get element properties
            const tagName = element.tagName.toLowerCase();
            const inputType = (element as HTMLInputElement).type || '';
            
            // Determine correct type
            let elementType = tagName;
            if (tagName === 'input' && inputType) {
              elementType = inputType === 'submit' || inputType === 'button' ? 'button' : 'input';
            }

            // Get meaningful text with multiple fallbacks
            let text = element.getAttribute('aria-label') ||
                      element.getAttribute('title') ||
                      element.getAttribute('alt') ||
                      element.getAttribute('placeholder') ||
                      (element as HTMLInputElement).value ||
                      (element.textContent?.trim() || '') ||
                      testId ||
                      '';

            // Clean text
            text = (text || '').replace(/\s+/g, ' ').slice(0, 60).trim();

            // Generate selector
            const attr = element.hasAttribute('data-testid') ? 'data-testid' : 
                        element.hasAttribute('data-test') ? 'data-test' : 
                        element.hasAttribute('data-cy') ? 'data-cy' : 
                        element.hasAttribute('test-id') ? 'test-id' :
                        'data-qa';
            const selector_final = `[${attr}="${testId}"]`;

            // Determine action type based on element characteristics
            let action = 'interact with';
            
            if (tagName === 'button' || inputType === 'submit' || inputType === 'button') {
              action = 'click';
              elementType = 'button'; // Force correct type
            } else if (tagName === 'a' && element.hasAttribute('href')) {
              action = 'click';
            } else if (tagName === 'input' && ['text', 'email', 'password', 'search'].includes(inputType)) {
              action = 'enter text in';
              elementType = 'input'; // Force correct type
            } else if (tagName === 'textarea') {
              action = 'enter text in';
            } else if (tagName === 'select') {
              action = 'select option from';
            } else if (inputType === 'checkbox' || inputType === 'radio') {
              action = 'select';
            }

            // Special handling for SauceDemo elements
            if (testId === 'login-button') {
              elementType = 'button';
              action = 'click';
              text = text || 'Login';
            } else if (testId === 'username') {
              elementType = 'input';
              action = 'enter text in';
              text = text || 'Username';
            } else if (testId === 'password') {
              elementType = 'input';
              action = 'enter text in';
              text = text || 'Password';
            }

            elements.push({
              selector: selector_final,
              type: elementType,
              text: text || testId || `${elementType} element`,
              action,
              testId,
              role: element.getAttribute('role') || undefined
            });
          });
        } catch (e) {
          console.warn(`Selector "${selector}" caused error:`, e);
        }
      });

      // Process standard selectors for elements without test IDs
      standardSelectors.forEach(selector => {
        try {
          const elements_found = document.querySelectorAll(selector);
          
          elements_found.forEach((el) => {
            const element = el as HTMLElement;
            
            // Skip if element already has a test ID (already processed)
            const hasTestId = element.hasAttribute('data-testid') || 
                             element.hasAttribute('data-test') || 
                             element.hasAttribute('data-cy') ||
                             element.hasAttribute('test-id') ||
                             element.hasAttribute('data-qa');
            if (hasTestId) return;

            // Skip hidden or tiny elements
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return;
            
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            // Create unique identifier for deduplication
            const uniqueId = `${selector}-${rect.top.toFixed(0)}-${rect.left.toFixed(0)}`;
            if (processedElements.has(uniqueId)) return;
            processedElements.add(uniqueId);

            // Get element properties
            const tagName = element.tagName.toLowerCase();
            const inputType = (element as HTMLInputElement).type || '';
            const id = element.id;
            
            // Determine correct type
            let elementType = tagName;
            if (tagName === 'input' && inputType) {
              elementType = inputType === 'submit' || inputType === 'button' ? 'button' : 'input';
            }

            // Get meaningful text
            let text = element.getAttribute('aria-label') ||
                      element.getAttribute('title') ||
                      element.getAttribute('placeholder') ||
                      (element as HTMLInputElement).value ||
                      (element.textContent?.trim() || '') ||
                      id ||
                      '';

            text = (text || '').replace(/\s+/g, ' ').slice(0, 60).trim();

            // Generate selector
            let selector_final = '';
            if (id) {
              selector_final = `#${id}`;
            } else {
              selector_final = selector;
            }

            // Determine action
            let action = 'interact with';
            if (tagName === 'button' || inputType === 'submit' || inputType === 'button') {
              action = 'click';
              elementType = 'button';
            } else if (tagName === 'a') {
              action = 'click';
            } else if (tagName === 'input' && ['text', 'email', 'password', 'search'].includes(inputType)) {
              action = 'enter text in';
            } else if (tagName === 'textarea') {
              action = 'enter text in';
            } else if (tagName === 'select') {
              action = 'select option from';
            }

            if (text) {
              elements.push({
                selector: selector_final,
                type: elementType,
                text: text,
                action,
                testId: undefined,
                role: element.getAttribute('role') || undefined
              });
            }
          });
        } catch (e) {
          console.warn(`Selector "${selector}" caused error:`, e);
        }
      });

      return elements;
    });

    // Remove duplicates and sort by priority
    const uniqueElements = elementsData
      .filter((el, index, arr) => 
        arr.findIndex(e => e.testId === el.testId && e.selector === el.selector) === index
      )
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
      .slice(0, 10); // Reasonable limit

    console.log('🎯 Element extraction details:');
    uniqueElements.forEach((el, i) => {
      console.log(`   ${i + 1}. ${el.type.toUpperCase()}: "${el.text}" (${el.action}) - ${el.selector}`);
    });

    return uniqueElements;
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
    console.log('🚀🚀🚀 ENHANCED GENERATEFEATURE CALLED');
    console.log('   Elements array:', !!analysis.elements);
    console.log('   Elements length:', analysis.elements?.length);
    console.log('   Elements type:', typeof analysis.elements);
    console.log('   Analysis keys:', Object.keys(analysis));
    
    // 🚨 FORCE DEBUG - Let's see what's actually in elements
    if (analysis.elements) {
      console.log('   Elements content:', JSON.stringify(analysis.elements.slice(0, 3), null, 2));
    }
    
    const tag = `@${featureName.replace(/\s+/g, '').toLowerCase()}`;
    
    // 🚨 TEMPORARILY FORCE THE ENHANCED LOGIC
    console.log('🚨 FORCING ENHANCED LOGIC FOR DEBUG');
    
    // Group elements by type for better scenario organization
    const elements = analysis.elements || [];
    const buttons = elements.filter((el: any) => 
      el.type === 'button' || el.action === 'click' || el.text.toLowerCase().includes('button'));
    const inputs = elements.filter((el: any) => 
      el.action === 'enter text in' || el.type === 'input' || el.type === 'textarea');
    
    console.log(`   Buttons found: ${buttons.length}`);
    console.log(`   Inputs found: ${inputs.length}`);
    
    if (buttons.length > 0) {
      console.log('   Button details:', buttons.map((b: any) => `${b.type}:"${b.text}"`));
    }
    if (inputs.length > 0) {
      console.log('   Input details:', inputs.map((i: any) => `${i.type}:"${i.text}"`));
    }

    let scenarios = [];

    // Create realistic login scenario for SauceDemo
    if (inputs.length >= 2 && buttons.length >= 1) {
      const usernameField = inputs.find((input: any) => 
        input.text.toLowerCase().includes('username') || 
        input.testId?.toLowerCase().includes('username')
      ) || inputs[0];
      
      const passwordField = inputs.find((input: any) => 
        input.text.toLowerCase().includes('password') || 
        input.testId?.toLowerCase().includes('password')
      ) || inputs[1];
      
      const loginButton = buttons.find((btn: any) => 
        btn.text.toLowerCase().includes('login') ||
        btn.testId?.toLowerCase().includes('login')
      ) || buttons[0];

      // Generate random number of scenarios between 3 and 5
      const numScenarios = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      console.log(`🎲 Generating ${numScenarios} scenarios randomly`);

      // All possible scenarios
      const allScenarios = [
        {
          name: 'Successful login with valid credentials',
          content: `Scenario: Successful login with valid credentials
  When I enter "standard_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should be redirected to the products page
  And I should see the inventory list`
        },
        {
          name: 'Login fails with invalid credentials',
          content: `Scenario: Login fails with invalid credentials
  When I enter "invalid_user" in the "${this.getElementName(usernameField)}" field
  And I enter "wrong_password" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should see an error message
  And I should remain on the login page`
        },
        {
          name: 'Login validation with empty fields',
          content: `Scenario: Login validation with empty fields
  When I leave the "${this.getElementName(usernameField)}" field empty
  And I leave the "${this.getElementName(passwordField)}" field empty
  And I click the "${this.getElementName(loginButton)}" button
  Then I should see validation error messages
  And the login button should remain disabled or show error`
        },
        {
          name: 'Login attempt with locked out user',
          content: `Scenario: Login attempt with locked out user
  When I enter "locked_out_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should see a locked out error message
  And I should remain on the login page`
        },
        {
          name: 'Login with problem user account',
          content: `Scenario: Login with problem user account
  When I enter "problem_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should be logged in successfully
  But I may experience visual glitches on the products page`
        },
        {
          name: 'Login with performance user account',
          content: `Scenario: Login with performance user account
  When I enter "performance_glitch_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should be logged in successfully
  But the page load may be slower than normal`
        }
      ];

      // Always include the successful login scenario (most important)
      scenarios.push(allScenarios[0].content);
      console.log(`   ✅ Added: ${allScenarios[0].name}`);

      // Randomly select the remaining scenarios
      const remainingScenarios = allScenarios.slice(1);
      const shuffled = remainingScenarios.sort(() => Math.random() - 0.5);
      const selectedScenarios = shuffled.slice(0, numScenarios - 1);

      selectedScenarios.forEach((scenario) => {
        scenarios.push(scenario.content);
        console.log(`   ✅ Added: ${scenario.name}`);
      });
    }

    // If no specific scenarios were created, fall back to generic
    if (scenarios.length === 0) {
      console.log('⚠️ No specific scenarios created, using generic fallback');
      scenarios.push(`Scenario: Basic page interaction
  When I interact with the page elements
  Then the page should respond appropriately`);
    }

    return `${tag}
Feature: ${featureName}
As a user, I want to authenticate with ${analysis.title} so that I can access the application

Background:
  Given I am on the "${analysis.title}" login page
  And the page has loaded completely

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

  private getElementName(element: any): string {
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
    
    // Standard navigation steps - no custom dependencies
    steps.add(`Given('I am on the {string} login page', async function (pageName: string) {
  try {
    await this.page.goto('${analysis.url || 'https://www.saucedemo.com/'}');
    await this.page.waitForLoadState('networkidle');
    const title = await this.page.title();
    expect(title).toContain(pageName);
  } catch (error) {
    throw new Error(\`Failed to navigate to \${pageName} login page: \${error}\`);
  }
});`);

    steps.add(`Given('the page has loaded completely', async function () {
  try {
    await this.page.waitForTimeout(2000);
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
  } catch (error) {
    throw new Error(\`Page did not load completely: \${error}\`);
  }
});`);

    // Input steps - pure Playwright with inline selector logic
    const inputs = analysis.elements?.filter((el: any) => el.action === 'enter text in') || [];
    if (inputs.length > 0) {
      steps.add(`When('I enter {string} in the {string} field', async function (text: string, fieldName: string) {
  try {
    let selector = '';
    
    // Direct selector mapping - standard Playwright only
    switch (fieldName.toLowerCase()) {
      case 'username':
        selector = '[data-test="username"]';
        break;
      case 'password':
        selector = '[data-test="password"]';
        break;
      case 'email':
        selector = '[data-test="email"], input[type="email"]';
        break;
      default:
        selector = \`[data-test="\${fieldName.toLowerCase()}"]\`;
    }
    
    await this.page.fill(selector, text);
  } catch (error) {
    throw new Error(\`Failed to enter text in \${fieldName} field: \${error}\`);
  }
});`);

      steps.add(`When('I leave the {string} field empty', async function (fieldName: string) {
  try {
    let selector = '';
    
    switch (fieldName.toLowerCase()) {
      case 'username':
        selector = '[data-test="username"]';
        break;
      case 'password':
        selector = '[data-test="password"]';
        break;
      case 'email':
        selector = '[data-test="email"], input[type="email"]';
        break;
      default:
        selector = \`[data-test="\${fieldName.toLowerCase()}"]\`;
    }
    
    await this.page.fill(selector, '');
  } catch (error) {
    throw new Error(\`Failed to clear \${fieldName} field: \${error}\`);
  }
});`);
    }

    // Button click steps - pure Playwright
    const buttons = analysis.elements?.filter((el: any) => el.action === 'click') || [];
    if (buttons.length > 0) {
      steps.add(`When('I click the {string} button', async function (buttonName: string) {
  try {
    let selector = '';
    
    switch (buttonName.toLowerCase()) {
      case 'login':
      case 'login button':
        selector = '[data-test="login-button"]';
        break;
      case 'submit':
        selector = '[type="submit"], button:has-text("Submit")';
        break;
      case 'save':
        selector = 'button:has-text("Save")';
        break;
      default:
        selector = \`[data-test="\${buttonName.toLowerCase()}-button"]\`;
    }
    
    await this.page.click(selector);
    await this.page.waitForTimeout(2000);
  } catch (error) {
    throw new Error(\`Failed to click \${buttonName} button: \${error}\`);
  }
});`);
    }

    // Success verification steps - standard Playwright assertions
    steps.add(`Then('I should be redirected to the products page', async function () {
  try {
    await this.page.waitForURL('**/inventory.html', { timeout: 10000 });
    const currentUrl = this.page.url();
    expect(currentUrl).toContain('inventory');
  } catch (error) {
    throw new Error(\`Failed to redirect to products page: \${error}\`);
  }
});`);

    steps.add(`Then('I should see the inventory list', async function () {
  try {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
    const inventoryList = this.page.locator('.inventory_list');
    await expect(inventoryList).toBeVisible();
  } catch (error) {
    throw new Error(\`Failed to see inventory list: \${error}\`);
  }
});`);

    steps.add(`Then('I should be logged in successfully', async function () {
  try {
    await Promise.race([
      this.page.waitForURL('**/inventory.html', { timeout: 8000 }),
      this.page.waitForSelector('.inventory_list', { timeout: 8000 })
    ]);
    
    const currentUrl = this.page.url();
    const hasInventory = await this.page.locator('.inventory_list').isVisible();
    expect(currentUrl.includes('inventory') || hasInventory).toBeTruthy();
  } catch (error) {
    throw new Error(\`Login was not successful: \${error}\`);
  }
});`);

    // Error verification steps - standard Playwright locators
    steps.add(`Then('I should see an error message', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    await expect(errorElement).toBeVisible();
  } catch (error) {
    throw new Error(\`Expected error message not found: \${error}\`);
  }
});`);

    steps.add(`Then('I should see a locked out error message', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('locked out');
  } catch (error) {
    throw new Error(\`Locked out error message not found: \${error}\`);
  }
});`);

    steps.add(`Then('I should see validation error messages', async function () {
  try {
    await this.page.waitForSelector('[data-test="error"]', { timeout: 5000 });
    const errorElement = this.page.locator('[data-test="error"]');
    const errorText = await errorElement.textContent();
    expect(errorText).toMatch(/(required|Username|Password)/i);
  } catch (error) {
    throw new Error(\`Validation error messages not found: \${error}\`);
  }
});`);

    steps.add(`Then('I should remain on the login page', async function () {
  try {
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('inventory');
    
    const loginButton = this.page.locator('[data-test="login-button"]');
    await expect(loginButton).toBeVisible();
  } catch (error) {
    throw new Error(\`Not on login page as expected: \${error}\`);
  }
});`);

    // Performance and visual steps
    steps.add(`Then('I may experience visual glitches on the products page', async function () {
  try {
    await this.page.waitForSelector('.inventory_list', { timeout: 10000 });
    // Visual glitches are UI-specific - just verify we reached the page
  } catch (error) {
    throw new Error(\`Failed to reach products page: \${error}\`);
  }
});`);

    steps.add(`Then('the page load may be slower than normal', async function () {
  try {
    // Extended timeout for performance_glitch_user
    await this.page.waitForSelector('.inventory_list', { timeout: 15000 });
  } catch (error) {
    throw new Error(\`Page did not load even with extended timeout: \${error}\`);
  }
});`);

    steps.add(`Then('the login button should remain disabled or show error', async function () {
  try {
    // Check for error message (SauceDemo's validation approach)
    const hasError = await this.page.locator('[data-test="error"]').isVisible();
    expect(hasError).toBeTruthy();
  } catch (error) {
    throw new Error(\`Expected validation error not found: \${error}\`);
  }
});`);

    steps.add(`Then('the system should respond appropriately', async function () {
  try {
    await this.page.waitForTimeout(1000);
    const currentUrl = this.page.url();
    expect(currentUrl).not.toContain('error');
  } catch (error) {
    throw new Error(\`System did not respond appropriately: \${error}\`);
  }
});`);

    // Clean imports - only standard libraries
    return `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Auto-generated step definitions using standard Playwright methods
// No custom dependencies required - works with any Cucumber-Playwright setup

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