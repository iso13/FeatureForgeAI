/**
 * FeatureForgeAI - API Flow Engine CLI
 * Main entry point for scanning APIs and generating flow-aware BDD features.
 *
 * Usage:
 *   npx ts-node src/scanner/cli.ts scan --url <guidewire-base-url>
 *   npx ts-node src/scanner/cli.ts scan --dir ./docs/api
 *   npx ts-node src/scanner/cli.ts generate --flow "New Business Submission"
 *   npx ts-node src/scanner/cli.ts generate --all
 *   npx ts-node src/scanner/cli.ts interactive
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

import * as fs from "fs";
import * as path from "path";
import { ApiSpecScanner } from "./apiSpecScanner.js";
import type { ScanResult } from "./apiSpecScanner.js";
import { ApiFlowBuilder } from "./apiFlowBuilder.js";
import type { FlowGraph } from "./apiFlowBuilder.js";
import { FlowAwareFeatureGenerator } from "./flowAwareFeatureGenerator.js";
import type { GeneratedFeature, GenerationConfig } from "./flowAwareFeatureGenerator.js";

// ============================================================================
// Configuration
// ============================================================================

interface EngineConfig {
  // Scan sources
  apiBaseUrl?: string;
  apiSpecDir?: string;
  apiSpecFiles?: string[];

  // Authentication
  auth?: {
    username: string;
    password: string;
  };

  // Platform
  platform: "guidewire" | "custom";
  customPatternsFile?: string;

  // Output
  outputDir: string;
  featuresDir: string;
  stepsDir: string;

  // Cache
  cacheDir: string;
  useCache: boolean;

  // Generation
  generation: Partial<GenerationConfig>;
}

const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  platform: "guidewire",
  outputDir: "./output",
  featuresDir: "./src/features/generated",
  stepsDir: "./src/steps/generated",
  cacheDir: "./.featureforge-cache",
  useCache: true,
  generation: {},
};

// ============================================================================
// API Flow Engine - Orchestrator
// ============================================================================

export class ApiFlowEngine {
  private config: EngineConfig;
  private scanner: ApiSpecScanner;
  private scanResult: ScanResult | null = null;
  private flowGraph: FlowGraph | null = null;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.scanner = new ApiSpecScanner();
  }

  /**
   * Full pipeline: Scan → Build Flows → Generate Features
   */
  async run(flowName?: string): Promise<GeneratedFeature[]> {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  FeatureForgeAI - API Flow Engine               ║");
    console.log("║  Scan → Analyze → Generate                      ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    const startTime = Date.now();

    // Step 1: Scan API specs
    await this.scan();

    // Step 2: Build flow graph
    this.buildFlows();

    // Step 3: Generate features
    const features = flowName
      ? this.generateFeature(flowName)
      : this.generateAllFeatures();

    // Step 4: Write output files
    this.writeOutputFiles(features);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Total time: ${duration}s`);
    console.log(`📦 Generated ${features.length} features`);

    return features;
  }

  // ============================================================================
  // Step 1: Scan
  // ============================================================================

  async scan(): Promise<ScanResult> {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📡 Step 1: Scanning API Specifications");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check cache first
    if (this.config.useCache) {
      const cached = this.loadFromCache("scan-result.json");
      if (cached) {
        console.log("  📦 Loaded from cache");
        this.scanResult = cached;
        return cached;
      }
    }

    // Scan from Guidewire environment
    if (this.config.apiBaseUrl) {
      this.scanResult = await this.scanner.scanGuidewireEnvironment(
        this.config.apiBaseUrl,
        this.config.auth,
      );
    }
    // Scan from directory of spec files
    else if (this.config.apiSpecDir) {
      this.scanResult = await this.scanner.scanDirectory(this.config.apiSpecDir);
    }
    // Scan individual files
    else if (this.config.apiSpecFiles && this.config.apiSpecFiles.length > 0) {
      for (const file of this.config.apiSpecFiles) {
        await this.scanner.scanFromFile(file);
      }
      this.scanResult = {
        specs: this.scanner.getSpecs(),
        totalEndpoints: this.scanner.getSpecs().reduce((sum, s) => sum + s.endpoints.length, 0),
        totalSchemas: this.scanner.getSpecs().reduce((sum, s) => sum + Object.keys(s.schemas).length, 0),
        centers: this.scanner.getSpecs().map((s) => s.title),
        scanTimestamp: new Date().toISOString(),
      };
    } else {
      throw new Error("No API spec source configured. Provide apiBaseUrl, apiSpecDir, or apiSpecFiles.");
    }

    // Cache the result
    if (this.config.useCache) {
      this.saveToCache("scan-result.json", this.scanResult);
    }

    console.log(`\n  📊 Scan Complete:`);
    console.log(`     Centers: ${this.scanResult.centers.join(", ")}`);
    console.log(`     Endpoints: ${this.scanResult.totalEndpoints}`);
    console.log(`     Schemas: ${this.scanResult.totalSchemas}`);

    return this.scanResult;
  }

  // ============================================================================
  // Step 2: Build Flow Graph
  // ============================================================================

  buildFlows(): FlowGraph {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔨 Step 2: Building Business Flow Graph");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!this.scanResult) {
      throw new Error("No scan result available. Run scan() first.");
    }

    const builder = new ApiFlowBuilder(this.scanResult, this.config.platform);

    // Load custom patterns if provided
    if (this.config.customPatternsFile) {
      builder.loadCustomPatterns(this.config.customPatternsFile);
    }

    this.flowGraph = builder.buildFlowGraph();

    // Cache the flow graph
    if (this.config.useCache) {
      this.saveToCache("flow-graph.json", this.flowGraph);
    }

    return this.flowGraph;
  }

  // ============================================================================
  // Step 3: Generate Features
  // ============================================================================

  generateFeature(flowName: string): GeneratedFeature[] {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ Step 3: Generating Flow-Aware BDD Features");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!this.flowGraph || !this.scanResult) {
      throw new Error("Flow graph not built. Run buildFlows() first.");
    }

    const generator = new FlowAwareFeatureGenerator(
      this.flowGraph,
      this.scanResult,
      this.config.generation,
    );

    const feature = generator.generateFeature(flowName);
    return feature ? [feature] : [];
  }

  generateAllFeatures(): GeneratedFeature[] {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ Step 3: Generating ALL Flow-Aware BDD Features");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!this.flowGraph || !this.scanResult) {
      throw new Error("Flow graph not built. Run buildFlows() first.");
    }

    const generator = new FlowAwareFeatureGenerator(
      this.flowGraph,
      this.scanResult,
      this.config.generation,
    );

    return generator.generateAllFeatures();
  }

  // ============================================================================
  // Step 4: Write Output
  // ============================================================================

  private writeOutputFiles(features: GeneratedFeature[]): void {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💾 Step 4: Writing Output Files");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Ensure output directories exist
    fs.mkdirSync(this.config.featuresDir, { recursive: true });
    fs.mkdirSync(this.config.stepsDir, { recursive: true });
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    for (const feature of features) {
      // Write feature file
      const featurePath = path.join(this.config.featuresDir, `${feature.fileName}.feature`);
      fs.writeFileSync(featurePath, feature.featureContent, "utf-8");
      console.log(`  ✅ Feature: ${featurePath}`);

      // Write step definitions
      const stepsPath = path.join(this.config.stepsDir, `${feature.fileName}.steps.ts`);
      fs.writeFileSync(stepsPath, feature.stepDefinitions, "utf-8");
      console.log(`  ✅ Steps:   ${stepsPath}`);

      // Write metadata
      const metaPath = path.join(this.config.outputDir, `${feature.fileName}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify(feature.metadata, null, 2), "utf-8");
    }

    // Write summary report
    if (this.flowGraph && this.scanResult) {
      const generator = new FlowAwareFeatureGenerator(
        this.flowGraph,
        this.scanResult,
        this.config.generation,
      );

      const reportPath = path.join(this.config.outputDir, "generation-report.md");
      fs.writeFileSync(reportPath, generator.generateSummaryReport(), "utf-8");
      console.log(`\n  📄 Report: ${reportPath}`);
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private loadFromCache(filename: string): any | null {
    const cachePath = path.join(this.config.cacheDir, filename);
    if (!fs.existsSync(cachePath)) return null;

    try {
      const stat = fs.statSync(cachePath);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

      // Cache expires after 24 hours
      if (ageHours > 24) {
        console.log(`  ⏰ Cache expired (${ageHours.toFixed(1)}h old)`);
        return null;
      }

      return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } catch {
      return null;
    }
  }

  private saveToCache(filename: string, data: any): void {
    fs.mkdirSync(this.config.cacheDir, { recursive: true });
    const cachePath = path.join(this.config.cacheDir, filename);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    if (fs.existsSync(this.config.cacheDir)) {
      fs.rmSync(this.config.cacheDir, { recursive: true });
      console.log("🗑️  Cache cleared");
    }
  }

  // ============================================================================
  // Public Query Methods
  // ============================================================================

  /**
   * List all available flows after scanning
   */
  listFlows(): string[] {
    if (!this.flowGraph) return [];
    return this.flowGraph.flows.map(
      (f) => `${f.name} (${f.category}) - ${f.steps.length} steps [${f.estimatedComplexity}]`,
    );
  }

  /**
   * Get the API call chain for a specific flow
   */
  getCallChain(flowName: string): string[] {
    if (!this.flowGraph || !this.scanResult) return [];

    const builder = new ApiFlowBuilder(this.scanResult, this.config.platform);
    return builder.getCallChain(flowName, this.flowGraph);
  }

  /**
   * Search for endpoints by keyword
   */
  searchEndpoints(keyword: string): string[] {
    const endpoints = this.scanner.findEndpoints(keyword);
    return endpoints.map((e) => `${e.method} ${e.path} - ${e.summary}`);
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help") {
    printHelp();
    return;
  }

  const engine = new ApiFlowEngine(parseCliArgs(args));

  switch (command) {
    case "scan": {
      const result = await engine.scan();
      console.log(`\nScan complete. ${result.totalEndpoints} endpoints found.`);
      break;
    }

    case "flows": {
      await engine.scan();
      engine.buildFlows();
      const flows = engine.listFlows();
      console.log("\nAvailable flows:");
      flows.forEach((f) => console.log(`  • ${f}`));
      break;
    }

    case "generate": {
      const flowName = getArgValue(args, "--flow");
      const all = args.includes("--all");

      if (all) {
        await engine.run();
      } else if (flowName) {
        await engine.run(flowName);
      } else {
        console.error("Specify --flow <name> or --all");
      }
      break;
    }

    case "chain": {
      const flowName = getArgValue(args, "--flow");
      if (!flowName) {
        console.error("Specify --flow <name>");
        return;
      }
      await engine.scan();
      engine.buildFlows();
      const chain = engine.getCallChain(flowName);
      console.log(`\nAPI call chain for "${flowName}":`);
      chain.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
      break;
    }

    case "search": {
      const keyword = getArgValue(args, "--keyword") || args[1];
      if (!keyword) {
        console.error("Specify --keyword <term>");
        return;
      }
      await engine.scan();
      const results = engine.searchEndpoints(keyword);
      console.log(`\nEndpoints matching "${keyword}":`);
      results.forEach((r) => console.log(`  • ${r}`));
      break;
    }

    case "clear-cache": {
      engine.clearCache();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
  }
}

function parseCliArgs(args: string[]): Partial<EngineConfig> {
  const config: Partial<EngineConfig> = {};

  const url = getArgValue(args, "--url");
  if (url) config.apiBaseUrl = url;

  const dir = getArgValue(args, "--dir");
  if (dir) config.apiSpecDir = dir;

  const file = getArgValue(args, "--file");
  if (file) config.apiSpecFiles = [file];

  const user = getArgValue(args, "--user");
  const pass = getArgValue(args, "--pass");
  if (user && pass) config.auth = { username: user, password: pass };

  const output = getArgValue(args, "--output");
  if (output) config.outputDir = output;

  const patterns = getArgValue(args, "--patterns");
  if (patterns) config.customPatternsFile = patterns;

  if (args.includes("--no-cache")) config.useCache = false;

  return config;
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════╗
║  FeatureForgeAI - API Flow Engine                ║
╚══════════════════════════════════════════════════╝

Commands:
  scan        Scan API specifications
  flows       List discovered business flows
  generate    Generate BDD features from flows
  chain       Show API call chain for a flow
  search      Search for endpoints by keyword
  clear-cache Clear cached scan results

Options:
  --url <url>         Guidewire environment base URL
  --dir <path>        Directory containing API spec files
  --file <path>       Single API spec file
  --user <username>   API authentication username
  --pass <password>   API authentication password
  --flow <name>       Target flow name
  --all               Generate all flows
  --output <path>     Output directory
  --patterns <path>   Custom domain patterns JSON file
  --no-cache          Skip cache

Examples:
  # Scan a live Guidewire environment
  npx ts-node src/scanner/cli.ts scan --url https://pc-qa.example.com

  # Scan local API spec files
  npx ts-node src/scanner/cli.ts scan --dir ./docs/api

  # List discovered flows
  npx ts-node src/scanner/cli.ts flows --dir ./docs/api

  # Generate feature for a specific flow
  npx ts-node src/scanner/cli.ts generate --dir ./docs/api --flow "New Business Submission"

  # Generate ALL features
  npx ts-node src/scanner/cli.ts generate --dir ./docs/api --all

  # Show API call chain
  npx ts-node src/scanner/cli.ts chain --dir ./docs/api --flow "Policy Cancellation"

  # Search for endpoints
  npx ts-node src/scanner/cli.ts search --dir ./docs/api --keyword "cancel"
`);
}

// Run if called directly
main().catch(console.error);
