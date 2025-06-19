
/* eslint-disable */
// src/scripts/dom-generator.ts
import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Step = {
  action: 'click' | 'fill' | 'select' | 'check' | 'navigate' | 'assert';
  selector: string;
  text?: string;
  value?: string;
  testId?: string;
  label?: string;
  role?: string;
  priority?: 'high' | 'medium' | 'low';
  // Additional properties for element info
  type?: string;
  tagName?: string;
  placeholder?: string;
  visible?: boolean;
  disabled?: boolean;
};

interface DOMGeneratorOptions {
  includeDataTestIds?: boolean;
  preferAriaLabels?: boolean;
  generateAssertions?: boolean;
  maxElementsPerType?: number;
  timeout?: number;
}

class DOMStepGenerator {
  private browser?: Browser;
  private page?: Page;
  private options: DOMGeneratorOptions;

  constructor(options: DOMGeneratorOptions = {}) {
    this.options = {
      includeDataTestIds: true,
      preferAriaLabels: true,
      generateAssertions: true,
      maxElementsPerType: 10,
      timeout: 30000,
      ...options
    };
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Better CI/Docker compatibility
    });
    this.page = await this.browser.newPage();
    if (this.page && this.options.timeout) {
      this.page.setDefaultTimeout(this.options.timeout);
    }
    
    // Set a realistic viewport
    if (this.page) {
      await this.page.setViewportSize({ width: 1280, height: 720 });
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async getBestSelector(element: any): Promise<string> {
    const selectors = await element.evaluate((el: Element) => {
      const results: string[] = [];
      
      // Priority 1: data-testid
      const testId = el.getAttribute('data-testid');
      if (testId) results.push(`[data-testid="${testId}"]`);
      
      // Priority 2: id
      if (el.id) results.push(`#${el.id}`);
      
      // Priority 3: aria-label
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) results.push(`[aria-label="${ariaLabel}"]`);
      
      // Priority 4: role + accessible name
      const role = el.getAttribute('role');
      if (role) {
        const name = el.textContent?.trim();
        if (name && name.length < 50) { // Avoid very long text
          results.push(`[role="${role}"]`);
        }
      }
      
      // Priority 5: name attribute
      const name = el.getAttribute('name');
      if (name) results.push(`[name="${name}"]`);
      
      // Priority 6: class (if not too generic)
      const classList = el.classList;
      if (classList.length > 0) {
        const firstClass = classList[0];
        if (firstClass && 
            !firstClass.includes('btn') && 
            !firstClass.includes('form') &&
            !firstClass.includes('component') &&
            firstClass.length > 2) {
          results.push(`.${firstClass}`);
        }
      }
      
      // Priority 7: type attribute for inputs
      const type = el.getAttribute('type');
      if (type && el.tagName.toLowerCase() === 'input') {
        results.push(`input[type="${type}"]`);
      }
      
      // Fallback: tag name
      const tag = el.tagName.toLowerCase();
      results.push(tag);
      
      return results;
    });
    
    return selectors[0] || 'unknown';
  }

  private async getElementInfo(element: any): Promise<Step> {
    const info = await element.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return {
        text: el.textContent?.trim().substring(0, 100) || '', // Limit text length
        value: (el as HTMLInputElement).value || '',
        placeholder: el.getAttribute('placeholder') || '',
        label: el.getAttribute('aria-label') || el.getAttribute('title') || '',
        role: el.getAttribute('role') || '',
        type: el.getAttribute('type') || '',
        tagName: el.tagName.toLowerCase(),
        testId: el.getAttribute('data-testid') || '',
        visible: rect.width > 0 && rect.height > 0 && rect.top >= 0,
        disabled: (el as HTMLInputElement).disabled || el.getAttribute('disabled') !== null
      };
    });
    
    return {
      action: 'click', // Default action, will be overridden
      selector: '', // Will be set later
      ...info
    } as Step;
  }

  async extractDOMActions(url: string): Promise<Step[]> {
    if (!this.page) throw new Error('Generator not initialized');
    
    console.log(`🔍 Analyzing DOM for: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error) {
      console.warn(`Navigation warning for ${url}:`, error);
      // Try to continue with domcontentloaded if networkidle fails
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    const steps: Step[] = [];

    // Wait for dynamic content
    await this.page.waitForTimeout(2000);

    try {
      console.log('📝 Extracting clickable elements...');
      const clickableSteps = await this.extractClickableElements();
      steps.push(...clickableSteps);

      console.log('📝 Extracting form elements...');
      const formSteps = await this.extractFormElements();
      steps.push(...formSteps);

      console.log('📝 Extracting navigation elements...');
      const navSteps = await this.extractNavigationElements();
      steps.push(...navSteps);

      if (this.options.generateAssertions) {
        console.log('📝 Extracting assertion elements...');
        const assertionSteps = await this.extractAssertions();
        steps.push(...assertionSteps);
      }

    } catch (error) {
      console.warn('Error extracting DOM elements:', error);
    }

    const dedupedSteps = this.deduplicateSteps(steps);
    console.log(`✅ Extracted ${dedupedSteps.length} unique steps`);
    
    return dedupedSteps;
  }

  private async extractClickableElements(): Promise<Step[]> {
    const steps: Step[] = [];
    const selectors = [
      'button:not([disabled]):not([hidden])',
      'input[type="submit"]:not([disabled]):not([hidden])',
      'input[type="button"]:not([disabled]):not([hidden])',
      'a[href]:not([href="#"]):not([href="javascript:void(0)"]):not([hidden])',
      '[role="button"]:not([disabled]):not([hidden])',
      '[data-testid*="button"]:not([disabled]):not([hidden])',
      '[data-testid*="btn"]:not([disabled]):not([hidden])'
    ];

    for (const selector of selectors) {
      try {
        const elements = await this.page!.locator(selector).all();
        
        for (const element of elements.slice(0, this.options.maxElementsPerType)) {
          const info = await this.getElementInfo(element);
          
          // Skip if element is not visible or disabled
          if (!info.visible || info.disabled) continue;
          
          const bestSelector = await this.getBestSelector(element);
          
          if (info.text || info.label) {
            // Skip accessibility-only elements that aren't typically clicked
            const skipPatterns = [
              'skip to main content',
              'skip to navigation', 
              'skip to footer',
              'skip link'
            ];
            
            const textLower = (info.text || '').toLowerCase();
            if (skipPatterns.some(pattern => textLower.includes(pattern))) {
              continue; // Skip accessibility elements
            }
            
            steps.push({
              action: 'click',
              selector: bestSelector,
              text: info.text || info.label,
              label: info.label,
              testId: info.testId,
              priority: info.testId ? 'high' : info.text ? 'medium' : 'low'
            });
          }
        }
      } catch (error) {
        console.warn(`Error extracting ${selector}:`, error);
      }
    }

    return steps;
  }

  private async extractFormElements(): Promise<Step[]> {
    const steps: Step[] = [];
    const inputSelectors = [
      'input[type="text"]:not([disabled]):not([hidden])',
      'input[type="email"]:not([disabled]):not([hidden])',
      'input[type="password"]:not([disabled]):not([hidden])',
      'input[type="number"]:not([disabled]):not([hidden])',
      'input[type="tel"]:not([disabled]):not([hidden])',
      'input[type="url"]:not([disabled]):not([hidden])',
      'textarea:not([disabled]):not([hidden])',
      'select:not([disabled]):not([hidden])',
      'input[type="checkbox"]:not([disabled]):not([hidden])',
      'input[type="radio"]:not([disabled]):not([hidden])'
    ];

    for (const selector of inputSelectors) {
      try {
        const elements = await this.page!.locator(selector).all();
        
        for (const element of elements.slice(0, this.options.maxElementsPerType)) {
          const info = await this.getElementInfo(element);
          
          // Skip if element is not visible or disabled
          if (!info.visible || info.disabled) continue;
          
          const bestSelector = await this.getBestSelector(element);
          
          let action: Step['action'] = 'fill';
          let sampleValue = 'test value';

          // Determine action and sample value based on input type
          switch (info.type) {
            case 'email':
              sampleValue = 'test@example.com';
              break;
            case 'password':
              sampleValue = 'Password123!';
              break;
            case 'number':
              sampleValue = '123';
              break;
            case 'tel':
              sampleValue = '+1-555-123-4567';
              break;
            case 'url':
              sampleValue = 'https://example.com';
              break;
            case 'checkbox':
            case 'radio':
              action = 'check';
              sampleValue = '';
              break;
          }

          if (info.tagName === 'select') {
            action = 'select';
            sampleValue = 'option1';
          }

          // Get label from associated label element or placeholder
          let fieldLabel = info.label || info.placeholder;
          if (!fieldLabel) {
            try {
              const labelElement = await this.page!.locator(`label[for="${await element.getAttribute('id')}"]`).first();
              fieldLabel = await labelElement.textContent() || '';
            } catch {
              // No associated label found
            }
          }

          steps.push({
            action,
            selector: bestSelector,
            text: fieldLabel || `${info.type || 'input'} field`,
            value: sampleValue,
            testId: info.testId,
            priority: info.testId ? 'high' : 'medium'
          });
        }
      } catch (error) {
        console.warn(`Error extracting ${selector}:`, error);
      }
    }

    return steps;
  }

  private async extractNavigationElements(): Promise<Step[]> {
    const steps: Step[] = [];
    
    try {
      const navSelectors = [
        'nav a:not([href="#"]):not([hidden])',
        '[role="navigation"] a:not([href="#"]):not([hidden])',
        'header a:not([href="#"]):not([hidden])',
        '.navigation a:not([href="#"]):not([hidden])',
        '.nav a:not([href="#"]):not([hidden])'
      ];

      for (const selector of navSelectors) {
        try {
          const navLinks = await this.page!.locator(selector).all();
          
          for (const link of navLinks.slice(0, 5)) {
            const info = await this.getElementInfo(link);
            
            if (!info.visible) continue;
            
            const bestSelector = await this.getBestSelector(link);
            
            if (info.text && info.text.length > 0 && info.text.length < 50) {
              steps.push({
                action: 'navigate',
                selector: bestSelector,
                text: info.text,
                priority: 'medium'
              });
            }
          }
        } catch (error) {
          console.warn(`Error extracting navigation ${selector}:`, error);
        }
      }
    } catch (error) {
      console.warn('Error extracting navigation elements:', error);
    }

    return steps;
  }

  private async extractAssertions(): Promise<Step[]> {
    const steps: Step[] = [];
    
    try {
      // Extract headings and key content for assertions
      const assertionSelectors = [
        'h1:not([hidden])',
        'h2:not([hidden])',
        'h3:not([hidden])',
        '[data-testid*="title"]:not([hidden])',
        '[data-testid*="heading"]:not([hidden])',
        '.title:not([hidden])',
        '.heading:not([hidden])'
      ];

      for (const selector of assertionSelectors) {
        try {
          const elements = await this.page!.locator(selector).all();
          
          for (const element of elements.slice(0, 3)) {
            const info = await this.getElementInfo(element);
            
            if (!info.visible) continue;
            
            const bestSelector = await this.getBestSelector(element);
            
            if (info.text && info.text.length > 0 && info.text.length < 100) {
              steps.push({
                action: 'assert',
                selector: bestSelector,
                text: info.text,
                priority: 'high'
              });
            }
          }
        } catch (error) {
          console.warn(`Error extracting assertion ${selector}:`, error);
        }
      }
    } catch (error) {
      console.warn('Error extracting assertions:', error);
    }

    return steps;
  }

  private deduplicateSteps(steps: Step[]): Step[] {
    const seen = new Set<string>();
    const uniqueSteps: Step[] = [];
    
    for (const step of steps) {
      const key = `${step.action}-${step.selector}-${step.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSteps.push(step);
      }
    }
    
    // Sort by priority (high -> medium -> low) and then by action type
    return uniqueSteps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'low'];
      const bPriority = priorityOrder[b.priority || 'low'];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Secondary sort by action type
      const actionOrder = { assert: 0, fill: 1, click: 2, select: 3, check: 4, navigate: 5 };
      return actionOrder[a.action] - actionOrder[b.action];
    });
  }

  generateCucumberFeature(steps: Step[], featureName: string): string {
    const prioritySteps = steps.filter(s => s.priority === 'high');
    const mainSteps = prioritySteps.length > 3 ? prioritySteps : steps.slice(0, 10);

    // Group steps by type for better scenario structure
    const assertSteps = mainSteps.filter(s => s.action === 'assert');
    const fillSteps = mainSteps.filter(s => s.action === 'fill');
    const clickSteps = mainSteps.filter(s => s.action === 'click');
    const otherSteps = mainSteps.filter(s => !['assert', 'fill', 'click'].includes(s.action));

    const orderedSteps = [...assertSteps, ...fillSteps, ...clickSteps, ...otherSteps];

    return `@generated @ui @dom-generated
Feature: ${featureName}
  As a user
  I want to interact with the ${featureName} page
  So that I can complete my tasks successfully

  Background:
    Given I navigate to the page

  Scenario: Complete ${featureName} workflow
${orderedSteps.map(step => `    ${this.generateGherkinStep(step)}`).join('\n')}

  @smoke
  Scenario: Verify ${featureName} page elements
${assertSteps.slice(0, 3).map(step => `    ${this.generateGherkinStep(step)}`).join('\n')}
`;
  }

  private generateGherkinStep(step: Step): string {
    const cleanText = step.text?.replace(/"/g, "'") || step.selector;
    
    switch (step.action) {
      case 'click':
        return `When I click "${cleanText}"`;
      case 'fill':
        return `When I fill "${cleanText}" with "${step.value}"`;
      case 'select':
        return `When I select "${step.value}" from "${cleanText}"`;
      case 'check':
        return `When I check "${cleanText}"`;
      case 'navigate':
        return `When I navigate to "${cleanText}"`;
      case 'assert':
        return `Then I should see "${cleanText}"`;
      default:
        return `# Unknown action: ${step.action}`;
    }
  }

  generateStepDefinitions(steps: Step[], url?: string): string {
    const imports = `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world.js';

// Auto-generated step definitions from DOM analysis
// Generated on: ${new Date().toISOString()}
// Source URL: ${url || 'Unknown'}

`;

    // Generate unique step definitions (avoid duplicates)
    const uniqueSteps = new Map<string, Step>();
    
    steps.forEach(step => {
      const stepPattern = this.getStepPattern(step);
      if (!uniqueSteps.has(stepPattern)) {
        uniqueSteps.set(stepPattern, step);
      }
    });

    const stepDefs = Array.from(uniqueSteps.values())
      .map(step => this.generateStepDefinition(step))
      .join('\n\n');
    
    // Add the navigation background step with actual URL
    const navigationStep = `Given('I navigate to the page', async function (this: CustomWorld) {
  // Navigate to the analyzed page
  await this.page!.goto('${url || 'https://example.com'}');
  await this.page!.waitForLoadState('networkidle');
});`;
    
    return imports + stepDefs + '\n\n' + navigationStep;
  }

  private getStepPattern(step: Step): string {
    switch (step.action) {
      case 'click':
        return 'click-element';
      case 'fill':
        return 'fill-field';
      case 'select':
        return 'select-option';
      case 'check':
        return 'check-element';
      case 'assert':
        return 'should-see';
      case 'navigate':
        return 'navigate-to';
      default:
        return step.action;
    }
  }

  private generateStepDefinition(step: Step): string {
    const safeSelector = step.selector.replace(/'/g, "\\'");
    const safeText = step.text?.replace(/'/g, "\\'") || '';
    
    switch (step.action) {
      case 'click':
        return `When('I click {string}', async function (this: CustomWorld, element: string) {
  // Auto-generated selector: ${safeSelector}
  try {
    // First try the specific selector
    await this.page!.locator('${safeSelector}').click({ timeout: 5000 });
  } catch (error) {
    // Fallback to text-based click if selector fails
    await this.page!.getByText('${safeText}').first().click({ timeout: 5000 });
  }
});`;

      case 'fill':
        return `When('I fill {string} with {string}', async function (this: CustomWorld, field: string, value: string) {
  // Auto-generated selector: ${safeSelector}
  await this.page!.locator('${safeSelector}').fill(value);
});`;

      case 'select':
        return `When('I select {string} from {string}', async function (this: CustomWorld, option: string, dropdown: string) {
  // Auto-generated selector: ${safeSelector}
  await this.page!.locator('${safeSelector}').selectOption(option);
});`;

      case 'check':
        return `When('I check {string}', async function (this: CustomWorld, checkbox: string) {
  // Auto-generated selector: ${safeSelector}
  await this.page!.locator('${safeSelector}').check();
});`;

      case 'assert':
        // For assertions, use text-based locator for more reliable matching
        return `Then('I should see {string}', async function (this: CustomWorld, text: string) {
  // Auto-generated selector: ${safeSelector}
  // Using text-based locator for better reliability
  await expect(this.page!.getByText('${safeText}').first()).toBeVisible();
});`;

      case 'navigate':
        return `When('I navigate to {string}', async function (this: CustomWorld, linkText: string) {
  // Auto-generated selector: ${safeSelector}
  await this.page!.locator('${safeSelector}').click();
});`;

      default:
        return `// Unknown action: ${step.action}
// Selector: ${safeSelector}`;
    }
  }
}

// Main export function that the interactive script uses
export async function generateStepsFromDOM(
  url: string, 
  outDir: string, 
  featureName: string = 'Generated Feature',
  options?: DOMGeneratorOptions
): Promise<{ featurePath: string; stepDefsPath: string; stepsCount: number }> {
  const generator = new DOMStepGenerator(options);
  
  try {
    await generator.initialize();
    const steps = await generator.extractDOMActions(url);
    
    if (steps.length === 0) {
      throw new Error('No interactive elements found on the page. Please check the URL and try again.');
    }
    
    // Generate feature file
    const featureContent = generator.generateCucumberFeature(steps, featureName);
    const sanitizedFeatureName = featureName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const featurePath = path.join(outDir, `${sanitizedFeatureName}.feature`);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(featurePath), { recursive: true });
    fs.writeFileSync(featurePath, featureContent);
    
    // Generate step definitions with the actual URL
    const stepDefsContent = generator.generateStepDefinitions(steps, url);
    const stepDefsPath = path.join(path.dirname(outDir), 'steps', `${sanitizedFeatureName}.steps.ts`);
    
    // Ensure steps directory exists
    fs.mkdirSync(path.dirname(stepDefsPath), { recursive: true });
    fs.writeFileSync(stepDefsPath, stepDefsContent);
    
    console.log(`✅ Feature file written to ${featurePath}`);
    console.log(`✅ Step definitions written to ${stepDefsPath}`);
    console.log(`📊 Generated ${steps.length} steps from DOM analysis`);
    
    return { featurePath, stepDefsPath, stepsCount: steps.length };
    
  } finally {
    await generator.cleanup();
  }
}

// CLI usage
export async function generateFromCLI(): Promise<void> {
  const url = process.argv[2];
  const outDir = process.argv[3] || './src/features';
  const featureName = process.argv[4] || 'Generated Feature';
  
  if (!url) {
    console.error('Usage: node dom-generator.js <url> [output-dir] [feature-name]');
    console.error('');
    console.error('Examples:');
    console.error('  node dom-generator.js https://playwright.dev');
    console.error('  node dom-generator.js https://example.com ./src/features "Login Feature"');
    process.exit(1);
  }
  
  console.log('🚀 Starting DOM Generator CLI...');
  console.log(`URL: ${url}`);
  console.log(`Output: ${outDir}`);
  console.log(`Feature: ${featureName}`);
  console.log('');
  
  await generateStepsFromDOM(url, outDir, featureName, {
    includeDataTestIds: true,
    preferAriaLabels: true,
    generateAssertions: true,
    maxElementsPerType: 10
  });
}

// Check if this module is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  generateFromCLI().catch((error) => {
    console.error('❌ DOM Generator failed:', error.message);
    process.exit(1);
  });
}