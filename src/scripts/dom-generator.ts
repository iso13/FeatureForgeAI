import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

class DOMGenerator {
  private browser: any = null;
  private page: any = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async analyzePage(url: string) {
    if (!this.page) throw new Error('Page not initialized');
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    const title = await this.page.title();
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Simple extraction using Playwright's built-in methods
    const links = await this.extractSimpleElements('a[href]', 8);
    const buttons = await this.extractSimpleElements('button, input[type="button"], input[type="submit"]', 6);
    const inputs = await this.extractSimpleElements('input:not([type="button"]):not([type="submit"]), textarea', 5);
    const headings = await this.extractSimpleElements('h1, h2, h3', 4);
    
    const analysis = {
      url,
      title,
      domain,
      links,
      buttons,
      inputs,
      headings,
      userJourneys: this.detectUserJourneys(title, links, buttons, headings)
    };

    return analysis;
  }

  private async extractSimpleElements(selector: string, limit: number) {
    try {
      const elements = await this.page.$$(selector);
      const results = [];
      
      for (let i = 0; i < Math.min(elements.length, limit); i++) {
        const element = elements[i];
        
        try {
          const isVisible = await element.isVisible();
          if (!isVisible) continue;
          
          // Get text using the simplest method
          let text = '';
          try {
            text = await element.innerText();
          } catch (e) {
            try {
              text = await element.textContent();
            } catch (e2) {
              text = await element.getAttribute('aria-label') || 
                     await element.getAttribute('title') || 
                     await element.getAttribute('placeholder') || '';
            }
          }
          
          // Clean and validate text
          if (text) {
            text = text.replace(/\s+/g, ' ').trim();
            if (text.length > 100) {
              text = text.substring(0, 50) + '...';
            }
            if (text.length >= 2 && text.length <= 50) {
              // Only keep reasonable text
              const words = text.split(' ').slice(0, 6).join(' ');
              if (words.length >= 2) {
                results.push({
                  tagName: await element.evaluate((el: any) => el.tagName),
                  text: words,
                  selector: `text="${words}"`
                });
              }
            }
          }
        } catch (elementError) {
          // Skip problematic elements
          continue;
        }
      }
      
      return results;
    } catch (error) {
      console.warn(`Could not extract ${selector}:`, error.message);
      return [];
    }
  }

  private detectUserJourneys(title: string, links: any[], buttons: any[], headings: any[]) {
    const journeys = [];
    
    const allText = [
      title,
      ...links.map((l: any) => l.text),
      ...buttons.map((b: any) => b.text),
      ...headings.map((h: any) => h.text)
    ].join(' ').toLowerCase();

    if (allText.includes('doc') || allText.includes('guide') || allText.includes('learn')) {
      journeys.push({
        type: 'learning',
        scenario: 'User learns about the product',
        description: 'User wants to understand features and capabilities'
      });
    }

    if (allText.includes('start') || allText.includes('try') || allText.includes('demo')) {
      journeys.push({
        type: 'onboarding',
        scenario: 'User gets started with the product',
        description: 'New user wants to begin using the service'
      });
    }

    if (allText.includes('api') || allText.includes('developer') || allText.includes('integration')) {
      journeys.push({
        type: 'integration',
        scenario: 'Developer integrates the service',
        description: 'Developer wants to implement the API'
      });
    }

    return journeys;
  }

  generateFeature(analysis: any, featureName: string): string {
    let feature = `@generated @declarative-scenarios
Feature: ${featureName}
  As a user of ${analysis.domain}
  I want to accomplish my goals efficiently
  So that I can get value from the application

  # Generated on: ${new Date().toISOString().split('T')[0]}
  # Source URL: ${analysis.url}
  # Detected journeys: ${analysis.userJourneys.map((j: any) => j.type).join(', ')}

Background:
  Given I am a visitor to ${analysis.domain}

`;

    // Generate scenarios based on detected user journeys
    for (const journey of analysis.userJourneys) {
      feature += this.generateJourneyScenario(journey);
    }

    // Always include core scenarios
    feature += this.generateCoreScenarios(analysis);

    return feature;
  }

  private generateJourneyScenario(journey: any): string {
    let scenario = `Scenario: ${journey.scenario}
`;

    switch (journey.type) {
      case 'learning':
        scenario += `  When I want to understand features and capabilities
  And I explore the documentation
  Then I should find comprehensive guides
  And I should understand how to use the features
  And I should see practical examples

`;
        break;

      case 'onboarding':
        scenario += `  When I want to get started with the service
  And I begin the getting started process
  Then I should be guided through initial setup
  And I should see clear next steps
  And I should be able to complete basic tasks quickly

`;
        break;

      case 'integration':
        scenario += `  When I want to implement the API as a developer
  And I explore the API documentation
  Then I should understand the available endpoints
  And I should see code examples for my programming language
  And I should find integration guides

`;
        break;

      default:
        scenario += `  When I want to accomplish my goals
  And I use the application features
  Then I should be able to accomplish my goals
  And the experience should be intuitive

`;
        break;
    }

    return scenario;
  }

  private generateCoreScenarios(analysis: any): string {
    return `Scenario: User has a smooth initial experience
  When I visit ${analysis.domain} for the first time
  And I land on the homepage
  Then the page should load quickly
  And I should understand what the service offers
  And I should see clear calls to action

Scenario: User navigates efficiently
  When I want to explore different sections
  And I use the navigation
  Then I should reach my intended destination
  And the navigation should be consistent
  And I should always know where I am

Scenario: User completes their primary task
  When I have a specific goal in mind
  And I work toward accomplishing it
  Then the process should be intuitive
  And I should get feedback on my progress
  And I should be able to complete the task successfully

Scenario: User has an accessible experience
  When I use assistive technology
  And I interact with the application
  Then all functionality should be accessible
  And I should be able to navigate using only the keyboard
  And the content should be properly structured`;
  }

  async generateTestFile(url: string, outputPath: string, featureName: string): Promise<void> {
    try {
      await this.init();
      
      console.log(`🔍 Analyzing ${url} for user journeys...`);
      const analysis = await this.analyzePage(url);
      
      console.log(`📊 Detected journeys: ${analysis.userJourneys.map((j: any) => j.type).join(', ')}`);
      console.log(`📋 Found ${analysis.links.length} links, ${analysis.buttons.length} buttons, ${analysis.inputs.length} inputs`);
      
      const gherkinContent = this.generateFeature(analysis, featureName);
      
      const fileName = `${featureName.toLowerCase().replace(/\s+/g, '-')}.feature`;
      const fullPath = join(outputPath, fileName);
      
      writeFileSync(fullPath, gherkinContent);
      
      console.log(`✅ Generated declarative feature file: ${fullPath}`);
      console.log(`🎯 Feature focuses on user outcomes and business value`);
      console.log(`📄 Contains ${gherkinContent.split('Scenario:').length - 1} scenarios`);
      
    } catch (error) {
      console.error('❌ Error generating test file:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('❌ Usage: tsx dom-generator.ts <URL> <OUTPUT_PATH> <FEATURE_NAME>');
    console.error('   Example: tsx dom-generator.ts https://playwright.dev ./features "Playwright Documentation"');
    process.exit(1);
  }

  const [url, outputPath, featureName] = args;
  
  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    console.error('❌ Invalid URL provided');
    process.exit(1);
  }

  const generator = new DOMGenerator();
  
  try {
    await generator.generateTestFile(url, outputPath, featureName);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

// ES module compatible execution check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DOMGenerator };