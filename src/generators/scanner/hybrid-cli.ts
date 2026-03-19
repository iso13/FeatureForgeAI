// src/generators/scanner/hybrid-cli.ts
/**
 * FeatureForge AI - Hybrid CLI
 * Interactive command-line interface for the hybrid generator.
 * Scans API specs, discovers flows, then uses LLM to generate
 * declarative BDD features backed by real API data.
 *
 * Usage:
 *   npm run generate:hybrid
 *   npm run generate:hybrid -- --dir ./docs/api
 *   npm run generate:hybrid -- --provider ollama --model llama3.2
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */
// SPDX-License-Identifier: BSL-1.1

import dotenv from "dotenv";
dotenv.config();

import fs from "fs-extra";
import path from "path";
import { input, select, confirm, number as numberPrompt } from "@inquirer/prompts";
import { ApiSpecScanner } from "./apiSpecScanner.js";
import { ApiFlowBuilder } from "./apiFlowBuilder.js";
import type { FlowGraph, BusinessFlow } from "./apiFlowBuilder.js";
import {
  HybridGenerator,
  OpenAIClient,
  OllamaClient,
} from "./hybridGenerator.js";
import type { HybridGenerationRequest } from "./hybridGenerator.js";

// ============================================================================
// CLI Args
// ============================================================================

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] ?? "true";
      i++;
    }
  }
  return args;
}

// ============================================================================
// Display helpers
// ============================================================================

function displayFlows(flowGraph: FlowGraph): void {
  console.log("\n📊 Discovered Business Flows:");
  console.log("─".repeat(60));

  const byCenter = flowGraph.flows.reduce(
    (acc, flow) => {
      if (!acc[flow.center]) acc[flow.center] = [];
      acc[flow.center].push(flow);
      return acc;
    },
    {} as Record<string, BusinessFlow[]>,
  );

  for (const [center, flows] of Object.entries(byCenter)) {
    console.log(`\n  ${center}:`);
    flows.forEach((flow) => {
      const priority = flow.priority === "high" ? "🔴" : flow.priority === "medium" ? "🟡" : "🟢";
      console.log(`    ${priority} ${flow.name} (${flow.steps.length} API steps)`);
    });
  }
  console.log("");
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  FeatureForgeAI - Hybrid Generator                  ║");
  console.log("║  API Scanner + LLM = Accurate BDD Features          ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Step 1: Determine API spec source
  const specDir = args.dir ?? "./docs/api";
  const specFile = args.file;

  if (!specDir && !specFile) {
    console.error("❌ Provide --dir or --file to specify API specs");
    process.exit(1);
  }

  // Step 2: Scan API specs
  console.log("📡 Scanning API specifications...");
  const scanner = new ApiSpecScanner();
  let scanResult;

  try {
    if (specFile) {
      scanResult = await scanner.scanFromFile(specFile);
    } else {
      scanResult = await scanner.scanFromDirectory(specDir);
    }
    console.log(
      `✅ Scanned ${scanResult.totalEndpoints} endpoints, ${scanResult.totalSchemas} schemas\n`,
    );
  } catch (error) {
    console.error("❌ Failed to scan API specs:", error);
    process.exit(1);
  }

  // Step 3: Build flow graph
  console.log("🔍 Discovering business flows...");
  const builder = new ApiFlowBuilder();
  const flowGraph = builder.buildFlowGraph(scanResult);
  console.log(`✅ Discovered ${flowGraph.flows.length} business flows\n`);

  displayFlows(flowGraph);

  if (flowGraph.flows.length === 0) {
    console.error("❌ No flows discovered. Check your API spec files.");
    process.exit(1);
  }

  // Step 4: Select flow
  const flowChoices = flowGraph.flows.map((flow) => ({
    name: `${flow.name} (${flow.center} · ${flow.steps.length} steps)`,
    value: flow.name,
  }));

  const selectedFlowName = await select({
    message: "Select a business flow to generate:",
    choices: flowChoices,
  });

  const selectedFlow = flowGraph.flows.find((f) => f.name === selectedFlowName)!;

  // Step 5: Configure generation
  console.log(`\n📝 Configuring generation for: ${selectedFlow.name}\n`);

  const defaultTitle = selectedFlow.name;
  const featureTitle = await input({
    message: "Feature title (Verb Noun format):",
    default: defaultTitle,
  });

  const userStory = await input({
    message: "User story:",
    default: `As a business user, I want to ${selectedFlow.name.toLowerCase()}, so that I can manage policies effectively`,
  });

  const scenarioCount = (await numberPrompt({
    message: "Number of scenarios to generate (2-8):",
    default: 4,
    validate: (val) =>
      val !== undefined && val >= 2 && val <= 8
        ? true
        : "Enter a number between 2 and 8",
  })) ?? 4;

  const includeNegative = await confirm({
    message: "Include negative/error scenarios?",
    default: true,
  });

  const includeCrossCenter = await confirm({
    message: "Include cross-center verification?",
    default: selectedFlow.crossCenterEffects?.length > 0,
  });

  // Step 6: Select LLM provider
  const providerArg = args.provider ?? process.env.LLM_PROVIDER ?? "openai";

  let provider: string;
  if (providerArg !== "openai" && providerArg !== "ollama") {
    provider = await select({
      message: "Select LLM provider:",
      choices: [
        { name: "OpenAI (cloud)", value: "openai" },
        { name: "Ollama (local)", value: "ollama" },
      ],
    });
  } else {
    provider = providerArg;
    console.log(`\n🤖 Using provider: ${provider}`);
  }

  let llmClient;
  if (provider === "ollama") {
    const model = args.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    console.log(`🦙 Ollama model: ${model} @ ${baseUrl}`);
    llmClient = new OllamaClient(model, baseUrl);
  } else {
    const model = args.model ?? process.env.OPENAI_MODEL ?? "gpt-4o";
    console.log(`🧠 OpenAI model: ${model}`);
    llmClient = new OpenAIClient(model);
  }

  // Step 7: Generate
  const request: HybridGenerationRequest = {
    featureTitle,
    userStory,
    scenarioCount,
    flowName: selectedFlowName,
    tags: [`@${selectedFlow.center.toLowerCase()}`],
    includeNegativeScenarios: includeNegative,
    includeCrossCenterVerification: includeCrossCenter,
  };

  console.log("\n⚡ Generating BDD features...\n");

  const generator = new HybridGenerator(llmClient);
  let result;

  try {
    result = await generator.generate(request, flowGraph, scanResult);
  } catch (error) {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  }

  // Step 8: Write output files
  const outputBase = path.join(
    "src",
    "examples",
    "features",
    "generated",
    selectedFlow.center.toLowerCase(),
  );
  const stepsBase = path.join(
    "src",
    "examples",
    "steps",
    "generated",
    selectedFlow.center.toLowerCase(),
  );

  const safeTitle = featureTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const featurePath = path.join(outputBase, `${safeTitle}.feature`);
  const stepsPath = path.join(stepsBase, `${safeTitle}.steps.ts`);

  await fs.ensureDir(outputBase);
  await fs.ensureDir(stepsBase);
  await fs.writeFile(featurePath, result.featureContent, "utf8");
  await fs.writeFile(stepsPath, result.stepDefinitions, "utf8");

  // Step 9: Summary
  console.log("\n✅ Generation complete!");
  console.log("─".repeat(60));
  console.log(`📄 Feature file:    ${featurePath}`);
  console.log(`🔧 Step definitions: ${stepsPath}`);
  console.log(`🤖 Provider:        ${result.metadata.provider}`);
  console.log(`⏱  Time:            ${result.metadata.generationTimeMs}ms`);
  console.log(`📊 Endpoints used:  ${result.metadata.endpointCount}`);
  console.log("─".repeat(60));

  const showPreview = await confirm({
    message: "Preview the generated feature file?",
    default: true,
  });

  if (showPreview) {
    console.log("\n" + "═".repeat(60));
    console.log(result.featureContent);
    console.log("═".repeat(60));
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
