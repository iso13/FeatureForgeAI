/**
 * FeatureForge AI - v3 Step Scaffolder (Enhanced)
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 *
 * Description:
 *  - Parses .feature files (including Background, Rules, Scenario Outlines)
 *  - Scaffolds TypeScript Playwright+Cucumber step definitions
 *  - Uses declarative style (no imperative verbs like "click" or "enter")
 *  - Automatically applies domain hints (AI, API, UI, Mock, etc.)
 *  - Supports DocStrings, DataTables, and complex Gherkin structures
 *  - Enhanced error handling, validation, and type safety
 *  - Designed to complement featureGeneratorOpenAI.v20.ts
 */

// SPDX-License-Identifier: BSL-1.1

import fs from "fs-extra";
import path from "path";
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

const generator = IdGenerator.uuid();

// ============================================================================
// Type Definitions
// ============================================================================

interface GherkinStep {
  keyword: string;
  text: string;
  docString?: { content: string; mediaType?: string };
  dataTable?: { rows: Array<{ cells: Array<{ value: string }> }> };
}

interface GherkinScenario {
  name: string;
  tags?: Array<{ name: string }>;
  steps: GherkinStep[];
  examples?: Array<{
    name?: string;
    tableHeader?: { cells: Array<{ value: string }> };
    tableBody?: Array<{ cells: Array<{ value: string }> }>;
  }>;
}

interface GherkinBackground {
  name?: string;
  steps: GherkinStep[];
}

interface GherkinRule {
  name: string;
  tags?: Array<{ name: string }>;
  children: Array<{
    background?: GherkinBackground;
    scenario?: GherkinScenario;
  }>;
}

interface GherkinFeature {
  name: string;
  description?: string;
  tags?: Array<{ name: string }>;
  children: Array<{
    background?: GherkinBackground;
    scenario?: GherkinScenario;
    rule?: GherkinRule;
  }>;
}

interface ScenarioBlock {
  kind: "background" | "scenario" | "scenario_outline";
  ruleName?: string;
  scenarioName?: string;
  steps: Array<{
    keyword: string;
    text: string;
    hasDocString: boolean;
    hasDataTable: boolean;
  }>;
  examples?: Array<any>;
}

export interface ScaffolderConfig {
  featuresDir?: string;
  stepsDir?: string;
  customDomainHints?: Record<string, string>;
  templateOverrides?: Record<string, (text: string, domainHint: string) => string>;
  overwriteExisting?: boolean;
}

export interface ScaffoldOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

// ============================================================================
// Enhanced Step Scaffolder
// ============================================================================

/**
 * Domain-aware scaffolder that generates realistic, minimal,
 * declarative step definitions from existing .feature files.
 */
export class EnhancedStepScaffolder {
  private config: Required<ScaffolderConfig>;

  constructor(config: ScaffolderConfig = {}) {
    this.config = {
      featuresDir: config.featuresDir ?? path.resolve("src/features"),
      stepsDir: config.stepsDir ?? path.resolve("src/steps"),
      customDomainHints: config.customDomainHints ?? {},
      templateOverrides: config.templateOverrides ?? {},
      overwriteExisting: config.overwriteExisting ?? false,
    };
  }

  /**
   * Scaffolds step definitions for a given feature file.
   */
  async scaffoldFeature(featurePath: string, options: ScaffoldOptions = {}) {
    const { dryRun = false, force = false, verbose = false } = options;

    try {
      // Validate input file exists
      if (!(await fs.pathExists(featurePath))) {
        throw new Error(`Feature file not found: ${featurePath}`);
      }

      if (verbose) {
        console.log(`🔍 Scaffolding steps for ${featurePath}`);
      }

      const content = await fs.readFile(featurePath, "utf-8");

      // Validate content is not empty
      if (!content.trim()) {
        throw new Error(`Feature file is empty: ${featurePath}`);
      }

      // Parse Gherkin
      const gherkinDocument = await this.parseGherkin(content, featurePath);
      const feature = gherkinDocument.feature as GherkinFeature;

      if (!feature) {
        console.warn(`⚠️  No feature found in ${featurePath}`);
        return;
      }

      const featureName = feature.name.trim();
      const featureFileName = this.toCamelCase(featureName);
      const stepDefsPath = path.resolve(this.config.stepsDir, `${featureFileName}.steps.ts`);

      // Check if file already exists
      if ((await fs.pathExists(stepDefsPath)) && !force && !this.config.overwriteExisting) {
        console.warn(`⚠️  Step file already exists: ${stepDefsPath}`);
        console.warn(`   Use --force flag or set overwriteExisting: true to overwrite`);
        return;
      }

      // Extract domain context
      const domainTags = (feature.tags || []).map((t) => t.name.toLowerCase());
      const blocks = this.collectAllBlocks(feature);
      const allStepTexts = blocks.flatMap((b) => b.steps.map((s) => s.text));
      const domainHint = this.inferDomainHint(domainTags, featureName, allStepTexts);

      // Generate step definitions
      const stepDefs = this.generateStepDefinitions(feature, blocks, domainHint);

      if (dryRun) {
        console.log("📋 Dry run - would generate the following step definitions:");
        console.log("─".repeat(80));
        console.log(stepDefs);
        console.log("─".repeat(80));
        console.log(`📁 Output path: ${stepDefsPath}`);
        return;
      }

      // Ensure output directory exists
      await fs.ensureDir(this.config.stepsDir);

      // Write step definitions
      await fs.outputFile(stepDefsPath, stepDefs);
      console.log(`✅ Step definitions written to ${stepDefsPath}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Scaffolding failed for ${featurePath}:`, error.message);
      } else {
        console.error(`❌ Scaffolding failed for ${featurePath}:`, error);
      }
      throw error;
    }
  }

  /**
   * Parse Gherkin with enhanced error handling
   */
  private async parseGherkin(content: string, featurePath: string): Promise<any> {
    try {
      const parser = new Parser(
        new AstBuilder(generator),
        new GherkinClassicTokenMatcher()
      );
      return parser.parse(content);
    } catch (error) {
      if (error instanceof Error && error.message?.includes("Parser errors")) {
        throw new Error(
          `Invalid Gherkin syntax in ${featurePath}:\n${error.message}`
        );
      }
      throw new Error(`Failed to parse ${featurePath}: ${error}`);
    }
  }

  /**
   * Generate complete step definitions file content
   */
  private generateStepDefinitions(
    feature: GherkinFeature,
    blocks: ScenarioBlock[],
    domainHint: string
  ): string {
    const featureName = feature.name.trim();

    let stepDefs = `/**
 * Auto-generated by FeatureForge AI v3 Enhanced Scaffolder
 * Feature: ${featureName}
 * Domain: ${domainHint}
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';
import type { DataTable } from '@cucumber/cucumber';

`;

    const seen = new Set<string>();

    // Emit Feature-level Background first (if any)
    const featureBackground = blocks.find((b) => b.kind === "background" && !b.ruleName);
    if (featureBackground) {
      stepDefs += this.generateSectionHeader("Background (Feature-level)");
      stepDefs += this.emitSteps(featureBackground.steps, domainHint, seen);
      stepDefs += "\n";
    }

    // Emit Rule-level Backgrounds
    const ruleBackgrounds = blocks.filter((b) => b.kind === "background" && b.ruleName);
    for (const rb of ruleBackgrounds) {
      stepDefs += this.generateSectionHeader(`Background (Rule: ${rb.ruleName})`);
      stepDefs += this.emitSteps(rb.steps, domainHint, seen);
      stepDefs += "\n";
    }

    // Emit Scenarios and Scenario Outlines
    const scenarios = blocks.filter((b) => b.kind === "scenario" || b.kind === "scenario_outline");
    for (const scenario of scenarios) {
      const typeLabel = scenario.kind === "scenario_outline" ? "Scenario Outline" : "Scenario";
      const ruleInfo = scenario.ruleName ? ` (Rule: ${scenario.ruleName})` : "";
      stepDefs += this.generateSectionHeader(`${typeLabel}${ruleInfo}: ${scenario.scenarioName}`);
      stepDefs += this.emitSteps(scenario.steps, domainHint, seen);
      stepDefs += "\n";
    }

    return stepDefs;
  }

  /**
   * Generate a formatted section header
   */
  private generateSectionHeader(title: string): string {
    return `// ${"-".repeat(75)}\n// ${title}\n// ${"-".repeat(75)}\n\n`;
  }

  /**
   * 🧠 Converts a string into lower camelCase
   */
  private toCamelCase(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, (match) => match.toLowerCase());
  }

  /**
   * Walk the Gherkin AST to collect Backgrounds and Scenarios (including Rules)
   */
  private collectAllBlocks(feature: GherkinFeature): ScenarioBlock[] {
    const blocks: ScenarioBlock[] = [];

    for (const child of feature.children ?? []) {
      // Handle Background
      if (child.background) {
        blocks.push({
          kind: "background",
          steps: this.normalizeSteps(child.background.steps ?? []),
        });
      }

      // Handle Scenario / Scenario Outline
      if (child.scenario) {
        const hasExamples = child.scenario.examples && child.scenario.examples.length > 0;
        blocks.push({
          kind: hasExamples ? "scenario_outline" : "scenario",
          scenarioName: child.scenario.name,
          steps: this.normalizeSteps(child.scenario.steps ?? []),
          examples: hasExamples ? child.scenario.examples : undefined,
        });
      }

      // Handle Rule
      if (child.rule) {
        const rule = child.rule;
        for (const rChild of rule.children ?? []) {
          if (rChild.background) {
            blocks.push({
              kind: "background",
              ruleName: rule.name,
              steps: this.normalizeSteps(rChild.background.steps ?? []),
            });
          }
          if (rChild.scenario) {
            const hasExamples =
              rChild.scenario.examples && rChild.scenario.examples.length > 0;
            blocks.push({
              kind: hasExamples ? "scenario_outline" : "scenario",
              ruleName: rule.name,
              scenarioName: rChild.scenario.name,
              steps: this.normalizeSteps(rChild.scenario.steps ?? []),
              examples: hasExamples ? rChild.scenario.examples : undefined,
            });
          }
        }
      }
    }
    return blocks;
  }

  /**
   * Normalize steps with proper keyword handling and metadata
   */
  private normalizeSteps(
    rawSteps: GherkinStep[]
  ): Array<{
    keyword: string;
    text: string;
    hasDocString: boolean;
    hasDataTable: boolean;
  }> {
    let previousKeyword = "Given";

    return rawSteps.map((step) => {
      const keyword = this.normalizeKeyword(step.keyword.trim(), previousKeyword);

      // Update previous keyword for next iteration
      if (["Given", "When", "Then"].includes(keyword)) {
        previousKeyword = keyword;
      }

      return {
        keyword,
        text: step.text.trim(),
        hasDocString: !!step.docString,
        hasDataTable: !!step.dataTable,
      };
    });
  }

  /**
   * Normalize keywords (And, But, * → inherit from previous)
   */
  private normalizeKeyword(keyword: string, previousKeyword: string): string {
    if (keyword === "And" || keyword === "But" || keyword === "*") {
      return previousKeyword;
    }
    return keyword;
  }

  /**
   * Emit step definitions for a list of steps, with deduplication
   */
  private emitSteps(
    steps: Array<{
      keyword: string;
      text: string;
      hasDocString: boolean;
      hasDataTable: boolean;
    }>,
    domainHint: string,
    seen: Set<string>
  ): string {
    let buf = "";
    for (const step of steps) {
      // Deduplicate by step text only (allows reuse across Given/When/Then)
      const key = step.text;
      if (seen.has(key)) continue;
      seen.add(key);

      buf +=
        this.generateStepImplementation(
          step.keyword,
          step.text,
          domainHint,
          step.hasDocString,
          step.hasDataTable
        ) + "\n\n";
    }
    return buf;
  }

  /**
   * Infer a domain category from tags, feature name, and step content
   */
  private inferDomainHint(tags: string[], featureName: string, steps: string[]): string {
    // Check custom domain hints first
    for (const [pattern, hint] of Object.entries(this.config.customDomainHints)) {
      const regex = new RegExp(pattern, "i");
      if (
        tags.some((t) => regex.test(t)) ||
        regex.test(featureName) ||
        steps.some((s) => regex.test(s))
      ) {
        return hint;
      }
    }

    // Default to UI / End-to-End for general purpose testing
    // Users can override via tags or custom domain hints configuration
    return "UI / End-to-End";
  }

  /**
   * Generate a context-aware step implementation
   */
  private generateStepImplementation(
    keyword: string,
    text: string,
    domainHint: string,
    hasDocString: boolean = false,
    hasDataTable: boolean = false
  ): string {
    // Check for template override
    if (this.config.templateOverrides[domainHint]) {
      const customBody = this.config.templateOverrides[domainHint](text, domainHint);
      return this.formatStepFunction(keyword, text, customBody, hasDocString, hasDataTable);
    }

    // Generate body based on domain
    let body = this.generateStepBody(keyword, text, domainHint, hasDocString, hasDataTable);

    return this.formatStepFunction(keyword, text, body, hasDocString, hasDataTable);
  }

  /**
   * Format the step function with proper signature
   */
  private formatStepFunction(
    keyword: string,
    text: string,
    body: string,
    hasDocString: boolean,
    hasDataTable: boolean
  ): string {
    const safeText = this.escapeQuotes(text);

    // Build parameter list
    let params = "this: CustomWorld";
    if (hasDocString) params += ", docString: string";
    if (hasDataTable) params += ", dataTable: DataTable";

    const stepHeader = `${keyword}(${safeText}, async function (${params}) {`;

    return `${stepHeader}${body}\n});`;
  }

  /**
   * Generate step body based on domain and context
   */
  private generateStepBody(
    keyword: string,
    text: string,
    domainHint: string,
    hasDocString: boolean,
    hasDataTable: boolean
  ): string {
    let body = "";
    const lowerText = text.toLowerCase();

    // Add DocString/DataTable handling if present
    if (hasDocString) {
      body += `\n  // Step includes a DocString\n  console.log('DocString content:', docString);\n`;
    }
    if (hasDataTable) {
      body += `\n  // Step includes a DataTable\n  const rows = dataTable.raw();\n  console.log('DataTable rows:', rows);\n`;
    }

    switch (domainHint) {
      case "AI / Machine Learning":
        body += this.generateAIStepBody(lowerText, text);
        break;

      case "API":
        body += this.generateAPIStepBody(lowerText, text);
        break;

      case "UI / End-to-End":
        body += this.generateUIStepBody(lowerText, text);
        break;

      case "Mock / Simulation":
        body += this.generateMockStepBody(text);
        break;

      case "Guidewire Platform":
        body += this.generateGuidewireStepBody(lowerText, text);
        break;

      default:
        body += this.generateGenericStepBody(text, domainHint);
    }

    return body;
  }

  /**
   * Generate AI/ML specific step body
   */
  private generateAIStepBody(lowerText: string, text: string): string {
    if (lowerText.includes("evaluate") || lowerText.includes("model")) {
      return `
  // Simulate AI model evaluation
  const result = await this.page.evaluate(() => {
    return { score: 0.82, risk: 'low', confidence: 0.95 };
  });
  this.modelOutput = result.score;
  console.log('AI model result:', result);
  expect(result).toHaveProperty('risk');
  expect(result.score).toBeGreaterThan(0);
`;
    } else if (lowerText.includes("bias") || lowerText.includes("fairness")) {
      return `
  // Validate fairness or bias metrics
  const biasReport = await this.page.locator('[data-testid="bias-report"]');
  await expect(biasReport).toBeVisible();
  const biasScore = await biasReport.getAttribute('data-bias-score');
  expect(parseFloat(biasScore || '0')).toBeLessThan(0.1);
`;
    } else if (lowerText.includes("explanation") || lowerText.includes("interpret")) {
      return `
  // Retrieve explainability output
  const explanation = await this.page.locator('[data-testid="explanation"]');
  await expect(explanation).toBeVisible();
  const explanationText = await explanation.textContent();
  expect(explanationText).toBeTruthy();
  console.log('Model explanation:', explanationText);
`;
    } else if (lowerText.includes("train") || lowerText.includes("training")) {
      return `
  // Simulate model training process
  const trainingStatus = await this.page.locator('[data-testid="training-status"]');
  await expect(trainingStatus).toContainText(/complete|success/i);
`;
    } else {
      return `
  // Placeholder for AI/ML validation logic
  console.log('Executing AI/ML step: "${text}"');
  // TODO: Implement specific AI logic for this step
`;
    }
  }

  /**
   * Generate API specific step body
   */
  private generateAPIStepBody(lowerText: string, text: string): string {
    if (lowerText.includes("send") || lowerText.includes("post") || lowerText.includes("request")) {
      return `
  // Perform API POST request
  const response = await this.apiClient.post('/api/endpoint', { 
    data: 'test-data',
    timestamp: new Date().toISOString()
  });
  expect(response.status).toBe(200);
  this.lastResponse = response.data;
`;
    } else if (lowerText.includes("get") || lowerText.includes("retrieve")) {
      return `
  // Perform API GET request
  const response = await this.apiClient.get('/api/endpoint');
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
  this.lastResponse = response.data;
`;
    } else if (lowerText.includes("response") || lowerText.includes("status")) {
      return `
  // Validate API response
  expect(this.lastResponse).toBeDefined();
  expect(this.lastResponse.status).toMatch(/success|ok/i);
`;
    } else {
      return `
  // Perform API interaction
  const response = await this.apiClient.post('/api/endpoint', { step: '${text}' });
  expect(response.status).toBe(200);
  this.lastResponse = response.data;
`;
    }
  }

  /**
   * Generate UI specific step body
   */
  private generateUIStepBody(lowerText: string, text: string): string {
    if (lowerText.includes("opens") || lowerText.includes("navigate") || lowerText.includes("visit")) {
      return `
  // Navigate to the page
  await this.page.goto('/your-page-url');
  // TODO: Replace '/your-page-url' with actual URL
`;
    } else if (lowerText.includes("visible") || lowerText.includes("displayed") || lowerText.includes("should be")) {
      return `
  // Verify element is visible
  const element = this.page.locator('your-selector');
  await expect(element).toBeVisible();
  // TODO: Replace 'your-selector' with actual selector (CSS, data-testid, etc.)
`;
    } else if (lowerText.includes("click") || lowerText.includes("interact")) {
      return `
  // Interact with element
  const element = this.page.locator('your-selector');
  await element.click();
  // TODO: Replace with actual interaction logic
`;
    } else if (lowerText.includes("fill") || lowerText.includes("enter") || lowerText.includes("input")) {
      return `
  // Fill input field
  await this.page.fill('your-selector', 'value');
  // TODO: Replace 'your-selector' and 'value' with actual values
`;
    } else if (lowerText.includes("see") || lowerText.includes("contains") || lowerText.includes("shows")) {
      return `
  // Verify content is present
  const element = this.page.locator('your-selector');
  await expect(element).toContainText('expected-text');
  // TODO: Replace with actual selector and expected text
`;
    } else {
      return `
  // TODO: Implement step logic for "${text}"
  // Common patterns:
  // - await this.page.goto('/url');
  // - await this.page.locator('selector').click();
  // - await expect(this.page.locator('selector')).toBeVisible();
`;
    }
  }

  /**
   * Generate Mock/Simulation specific step body
   */
  private generateMockStepBody(text: string): string {
    return `
  // Use mock data source to simulate "${text}"
  const mockValue = this.mockServer?.get('${this.normalizeSelector(text)}') || 'mocked-value';
  console.log('Mocked value:', mockValue);
  expect(mockValue).toBeDefined();
`;
  }

  /**
   * Generate Guidewire specific step body
   */
  private generateGuidewireStepBody(lowerText: string, text: string): string {
    if (lowerText.includes("policy")) {
      return `
  // Guidewire PolicyCenter operation
  const policy = await this.guidewireClient.getPolicy(this.policyNumber);
  expect(policy).toBeDefined();
  console.log('Policy retrieved:', policy.policyNumber);
`;
    } else if (lowerText.includes("claim")) {
      return `
  // Guidewire ClaimCenter operation
  const claim = await this.guidewireClient.getClaim(this.claimNumber);
  expect(claim).toBeDefined();
  console.log('Claim retrieved:', claim.claimNumber);
`;
    } else {
      return `
  // Guidewire Platform operation: "${text}"
  console.log('Executing Guidewire step');
  // TODO: Implement specific Guidewire logic
`;
    }
  }

  /**
   * Generate generic step body
   */
  private generateGenericStepBody(text: string, domainHint: string): string {
    return `
  // Generic declarative validation for step "${text}"
  console.log('Running step in domain: ${domainHint}');
  // TODO: Implement specific logic for this step
`;
  }

  /**
   * Escapes single/double/backtick quotes safely
   */
  private escapeQuotes(text: string): string {
    const hasSingle = text.includes("'");
    const hasDouble = text.includes('"');
    const hasBacktick = text.includes("`");

    if ((hasSingle && hasDouble) || hasBacktick) {
      return `\`${text.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\``;
    } else if (hasSingle) {
      return `"${text.replace(/"/g, '\\"')}"`;
    } else {
      return `'${text.replace(/'/g, "\\'")}'`;
    }
  }

  /**
   * Convert text into a simple data-testid-safe selector.
   */
  private normalizeSelector(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Scaffold all features in the features directory
   */
  async scaffoldAllFeatures(options: ScaffoldOptions = {}): Promise<void> {
    try {
      const featureFiles = await this.findFeatureFiles(this.config.featuresDir);

      if (featureFiles.length === 0) {
        console.warn(`⚠️  No feature files found in ${this.config.featuresDir}`);
        return;
      }

      console.log(`📦 Found ${featureFiles.length} feature file(s)`);

      for (const featureFile of featureFiles) {
        await this.scaffoldFeature(featureFile, options);
      }

      console.log(`\n✨ Scaffolding complete! Generated step definitions for ${featureFiles.length} feature(s)`);
    } catch (error) {
      console.error("❌ Failed to scaffold all features:", error);
      throw error;
    }
  }

  /**
   * Recursively find all .feature files in a directory
   */
  private async findFeatureFiles(dir: string): Promise<string[]> {
    const featureFiles: string[] = [];

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.findFeatureFiles(fullPath);
        featureFiles.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".feature")) {
        featureFiles.push(fullPath);
      }
    }

    return featureFiles;
  }
}

// ============================================================================
// CLI Support
// ============================================================================

// Check if this file is being run directly (works for both CommonJS and ES modules)
const isMainModule = typeof require !== 'undefined' && require.main === module || 
                     import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const args = process.argv.slice(2);

  // Parse CLI arguments
  const flags = {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    all: args.includes("--all"),
    help: args.includes("--help") || args.includes("-h"),
  };

  const featurePath = args.find((arg) => !arg.startsWith("--") && !arg.startsWith("-"));

  if (flags.help || (!featurePath && !flags.all)) {
    console.log(`
FeatureForge AI - v3 Enhanced Step Scaffolder

Usage:
  npm run scaffold:steps <feature-file> [options]
  npm run scaffold:steps --all [options]

Options:
  --all           Scaffold all .feature files in src/features/
  --dry-run       Preview generated steps without writing files
  --force         Overwrite existing step definition files
  --verbose, -v   Enable verbose logging
  --help, -h      Show this help message

Examples:
  npm run scaffold:steps src/features/login.feature
  npm run scaffold:steps src/features/login.feature --dry-run
  npm run scaffold:steps --all --force
    `);
    process.exit(0);
  }

  const scaffolder = new EnhancedStepScaffolder();

  const run = async () => {
    try {
      if (flags.all) {
        await scaffolder.scaffoldAllFeatures({
          dryRun: flags.dryRun,
          force: flags.force,
          verbose: flags.verbose,
        });
      } else if (featurePath) {
        await scaffolder.scaffoldFeature(featurePath, {
          dryRun: flags.dryRun,
          force: flags.force,
          verbose: flags.verbose,
        });
      }
    } catch (error) {
      console.error("❌ Scaffolding failed:", error);
      process.exit(1);
    }
  };

  run();
}

export default EnhancedStepScaffolder;
