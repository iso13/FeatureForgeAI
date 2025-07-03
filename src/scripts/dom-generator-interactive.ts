// src/scripts/dom-generator-interactive.ts
// This script generates a declarative feature file based on the DOM structure of a webpage.
// It uses Playwright to analyze the page and interactively gather user preferences for scenario generation.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

class InteractiveDOMGenerator {
  private browser: any = null;
  private page: any = null;
  private rl: any;

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    this.rl.close();
  }

  private question(query: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(query, resolve);
    });
  }

  private async multipleChoice(question: string, choices: string[]): Promise<number> {
    console.log(`\n${question}`);
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });
    
    while (true) {
      const answer = await this.question('\nEnter your choice (number): ');
      const choice = parseInt(answer) - 1;
      if (choice >= 0 && choice < choices.length) {
        return choice;
      }
      console.log('Invalid choice. Please try again.');
    }
  }

  private async checkboxes(question: string, options: string[]): Promise<number[]> {
    console.log(`\n${question}`);
    console.log('Enter multiple numbers separated by commas (e.g., 1,3,5) or "all" for all options:');
    options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
    
    while (true) {
      const answer = await this.question('\nYour selections: ');
      
      if (answer.toLowerCase() === 'all') {
        return options.map((_, index) => index);
      }
      
      const selections = answer.split(',')
        .map(s => parseInt(s.trim()) - 1)
        .filter(n => n >= 0 && n < options.length);
      
      if (selections.length > 0) {
        return selections;
      }
      
      console.log('Invalid selections. Please try again.');
    }
  }

  async gatherUserPreferences() {
    console.log('\nDOM Generator - Interactive Mode');
    console.log('=====================================');

    const focusChoice = await this.multipleChoice(
      'What type of scenarios do you want to generate?',
      [
        'Declarative (focuses on user goals and business outcomes)',
        'Imperative (focuses on specific UI interactions)',
        'Mixed (combination of both approaches)'
      ]
    );
    const focus = ['declarative', 'imperative', 'mixed'][focusChoice];

    const scenarioTypes = [
      'Accessibility testing scenarios',
      'Performance testing scenarios',
      'Mobile/responsive testing scenarios'
    ];
    
    const selectedTypes = await this.checkboxes(
      'Which additional scenario types should be included?',
      scenarioTypes
    );

    console.log('\nCustom Scenarios');
    const customScenarios: string[] = [];
    while (true) {
      const custom = await this.question('Add a custom scenario description (or press Enter to skip): ');
      if (!custom.trim()) break;
      customScenarios.push(custom.trim());
    }

    return {
      focus,
      includeAccessibility: selectedTypes.includes(0),
      includePerformance: selectedTypes.includes(1),
      includeMobile: selectedTypes.includes(2),
      customScenarios
    };
  }

  async analyzePageInteractively(url: string) {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log(`\nAnalyzing ${url}...`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    const title = await this.page.title();
    const domain = new URL(url).hostname.replace('www.', '');
    
    console.log(`Page title: ${title}`);
    console.log(`Domain: ${domain}`);

    console.log('\nExtracting page elements...');
    
    const links = await this.extractElementsWithFeedback('links', 'a[href]', 12);
    const buttons = await this.extractElementsWithFeedback('buttons', 'button, input[type="button"], input[type="submit"]', 10);
    const inputs = await this.extractElementsWithFeedback('inputs', 'input:not([type="button"]):not([type="submit"]), textarea', 8);
    const headings = await this.extractElementsWithFeedback('headings', 'h1, h2, h3', 6);

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

    // Let user choose journeys
    if (analysis.userJourneys.length > 0) {
      console.log('\nDetected User Journeys:');
      analysis.userJourneys.forEach((journey: any, index: number) => {
        console.log(`  ${index + 1}. ${journey.scenario} (${journey.type})`);
        console.log(`     ${journey.description}`);
      });

      const selectedJourneys = await this.checkboxes(
        'Which user journeys should be included in the scenarios?',
        analysis.userJourneys.map((j: any) => `${j.scenario} (${j.type})`)
      );

      analysis.userJourneys = selectedJourneys.map(index => analysis.userJourneys[index]);
    } else {
      console.log('\nNo specific user journeys detected. Will generate generic scenarios.');
    }

    return analysis;
  }

  private async extractElementsWithFeedback(type: string, selector: string, limit: number) {
    process.stdout.write(`  - Extracting ${type}... `);
    
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
      
      console.log(`Found ${results.length}`);
      return results;
    } catch (error) {
      console.log(`No elements found`);
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

    if (allText.includes('search') || allText.includes('find')) {
      journeys.push({
        type: 'discovery',
        scenario: 'User finds specific information',
        description: 'User searches for particular content'
      });
    }

    if (allText.includes('price') || allText.includes('plan') || allText.includes('buy')) {
      journeys.push({
        type: 'commercial',
        scenario: 'User evaluates pricing options',
        description: 'User considers purchasing or upgrading'
      });
    }

    return journeys;
  }

  generateFeature(analysis: any, featureName: string, options: any): string {
    let feature = `@generated @${options.focus}-scenarios
Feature: ${featureName}
  As a user of ${analysis.domain}
  I want to accomplish my goals efficiently
  So that I can get value from the application

  # Generated on: ${new Date().toISOString().split('T')[0]}
  # Source URL: ${analysis.url}
  # Generation mode: ${options.focus}
  # Selected journeys: ${analysis.userJourneys.map((j: any) => j.type).join(', ')}

Background:
  Given I am a visitor to ${analysis.domain}

`;

    // Generate scenarios based on user journeys
    for (const journey of analysis.userJourneys) {
      if (options.focus === 'declarative' || options.focus === 'mixed') {
        feature += this.generateDeclarativeScenario(journey);
      }
      
      if (options.focus === 'imperative' || options.focus === 'mixed') {
        feature += this.generateImperativeScenario(journey, analysis);
      }
    }

    // Add custom scenarios
    for (const customScenario of options.customScenarios) {
      feature += `Scenario: ${customScenario}
  Given I have a specific need
  When I work toward my goal
  Then I should be able to accomplish it successfully
  And the experience should be satisfactory

`;
    }

    // Additional scenario types
    if (options.includeAccessibility) {
      feature += this.generateAccessibilityScenarios();
    }

    if (options.includePerformance) {
      feature += this.generatePerformanceScenarios();
    }

    if (options.includeMobile) {
      feature += this.generateMobileScenarios();
    }

    return feature;
  }

  private generateDeclarativeScenario(journey: any): string {
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

      case 'discovery':
        scenario += `  When I need to find specific information
  And I search for specific information
  Then I should get relevant results
  And I should be able to refine my search
  And I should find what I'm looking for quickly

`;
        break;

      case 'commercial':
        scenario += `  When I am considering purchasing or upgrading
  And I evaluate the pricing options
  Then I should understand the different plans
  And I should see clear feature comparisons
  And I should be able to make an informed decision

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

  private generateImperativeScenario(journey: any, analysis: any): string {
    let scenario = `Scenario: User interacts with ${journey.type} elements
  Given I am on the main page
`;

    // Find relevant elements based on journey type
    const relevantElements = [...analysis.links, ...analysis.buttons].filter((element: any) =>
      element.text.toLowerCase().includes(journey.type) ||
      journey.type.includes(element.text.toLowerCase().substring(0, 5))
    );

    for (const element of relevantElements.slice(0, 2)) {
      if (element.tagName === 'A') {
        scenario += `  When I click on the "${element.text}" link
  Then I should navigate to the appropriate page
`;
      } else if (element.tagName === 'BUTTON') {
        scenario += `  When I click on the "${element.text}" button
  Then the corresponding action should be executed
`;
      }
    }

    scenario += '\n';
    return scenario;
  }

  private generateAccessibilityScenarios(): string {
    return `Scenario: User with disabilities has full access
  Given I am using assistive technology
  When I navigate through the application
  Then all interactive elements should be accessible
  And proper ARIA labels should be present
  And keyboard navigation should work correctly

`;
  }

  private generatePerformanceScenarios(): string {
    return `Scenario: User experiences fast page loads
  Given I am accessing the application
  When pages load
  Then they should load within acceptable time limits
  And the user experience should remain smooth
  And core functionality should be available quickly

`;
  }

  private generateMobileScenarios(): string {
    return `Scenario: User has consistent mobile experience
  Given I am using a mobile device
  When I access the application
  Then the layout should be responsive
  And all functionality should work on touch devices
  And the experience should be optimized for mobile

`;
  }

  async runInteractive(): Promise<void> {
    try {
      await this.init();
      
      // Get basic information
      const url = await this.question('\nEnter the URL to analyze: ');
      const outputPath = await this.question('Enter output directory (e.g., ./features): ');
      const featureName = await this.question('Enter feature name: ');
      
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        console.error('Invalid URL provided');
        return;
      }

      // Gather user preferences
      const options = await this.gatherUserPreferences();
      
      // Analyze page
      const analysis = await this.analyzePageInteractively(url);
      
      // Generate feature file
      console.log('\nGenerating scenarios...');
      const gherkinContent = this.generateFeature(analysis, featureName, options);
      
      const fileName = `${featureName.toLowerCase().replace(/\s+/g, '-')}.feature`;
      const fullPath = join(outputPath, fileName);
      
      writeFileSync(fullPath, gherkinContent);
      
      console.log(`\nGenerated feature file: ${fullPath}`);
      console.log(`Focus: ${options.focus} scenarios`);
      console.log(`Contains ${gherkinContent.split('Scenario:').length - 1} scenarios`);
      
      // Show preview
      const preview = await this.question('\nWould you like to see a preview? (y/n): ');
      if (preview.toLowerCase() === 'y') {
        console.log('\nGenerated Feature Preview:');
        console.log('='.repeat(50));
        console.log(gherkinContent.split('\n').slice(0, 20).join('\n'));
        console.log('...');
        console.log('='.repeat(50));
      }
      
    } catch (error) {
      console.error('Error in interactive mode:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// CLI execution
async function main() {
  const generator = new InteractiveDOMGenerator();
  await generator.runInteractive();
}

// ES module compatible execution check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { InteractiveDOMGenerator };