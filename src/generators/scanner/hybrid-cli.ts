/**
 * FeatureForge AI - Hybrid Generation CLI
 * Interactive command that combines API scanning with LLM generation.
 *
 * Usage:
 *   npx tsx src/scanner/hybrid-cli.ts --dir ./docs/api
 *   npx tsx src/scanner/hybrid-cli.ts --dir ./docs/api --flow "New Business Submission"
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

import * as fs from "fs";
import * as path from "path";
import { ApiSpecScanner } from "./apiSpecScanner.js";
import { ApiFlowBuilder } from "./apiFlowBuilder.js";
import {
  HybridGenerator,
  OpenAIClient,
  OllamaClient,
} from "./hybridGenerator.js";
import type { LLMClient, HybridGenerationRequest } from "./hybridGenerator.js";

// ============================================================================
// Interactive Hybrid Generation
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const specDir = getArgValue(args, "--dir") || "./docs/api";
  const flowArg = getArgValue(args, "--flow");
  const llmArg = getArgValue(args, "--llm") || "openai";
  const modelArg = getArgValue(args, "--model");
  const outputDir = getArgValue(args, "--output") || "./src/features/generated";
  const stepsDir = getArgValue(args, "--steps-output") || "./src/steps/generated";

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  FeatureForgeAI - Hybrid Generator              ║");
  console.log("║  Scanner Intelligence + LLM Expression          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Step 1: Scan API specs
  console.log("📡 Scanning API specifications...");
  const scanner = new ApiSpecScanner();
  const scanResult = await scanner.scanDirectory(specDir);
  console.log(`   Found ${scanResult.totalEndpoints} endpoints across ${scanResult.centers.length} specs\n`);

  // Step 2: Build flow graph
  console.log("🔨 Building business flow graph...");
  const builder = new ApiFlowBuilder(scanResult, "guidewire");
  const flowGraph = builder.buildFlowGraph();

  // Step 3: Initialize LLM client
  const llmClient = createLLMClient(llmArg, modelArg);
  console.log(`\n🤖 LLM: ${llmClient.modelName}\n`);

  // Step 4: Initialize hybrid generator
  const generator = new HybridGenerator(flowGraph, scanResult, llmClient);

  // Load project context for smarter generation
  const projectRoot = process.cwd();
  await generator.loadProjectContext(projectRoot);

  // Step 5: Select flow (interactive or from CLI arg)
  const availableFlows = generator.listAvailableFlows();

  if (availableFlows.length === 0) {
    console.error("❌ No business flows discovered. Check your API specs.");
    process.exit(1);
  }

  let selectedFlow: string;

  if (flowArg) {
    selectedFlow = flowArg;
  } else {
    console.log("📋 Available Business Flows:\n");
    availableFlows.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.name}`);
      console.log(`      ${f.description}`);
      console.log(`      Steps: ${f.steps} | Complexity: ${f.complexity}\n`);
    });

    // Use inquirer if available, otherwise use readline
    selectedFlow = await promptUser("Select a flow (enter name or number): ", availableFlows);
  }

  // Step 6: Gather feature details
  const featureTitle = await promptInput(
    "Feature title (Verb Noun format): ",
    toVerbNoun(selectedFlow),
  );

  const defaultStory = generateDefaultUserStory(selectedFlow, availableFlows);
  const userStory = await promptInput(
    "User story (As a... I want... So that...): ",
    defaultStory,
  );

  const scenarioCountStr = await promptInput(
    "Number of scenarios (2-6): ",
    "4",
  );
  const scenarioCount = Math.min(6, Math.max(2, parseInt(scenarioCountStr, 10) || 4));

  // Step 7: Generate
  const request: HybridGenerationRequest = {
    featureTitle,
    userStory,
    scenarioCount,
    flowName: selectedFlow,
    includeNegativeScenarios: true,
    includeCrossCenterVerification: true,
  };

  const result = await generator.generate(request);

  // Step 8: Write output files
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(stepsDir, { recursive: true });

  const sanitizedName = featureTitle.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");

  const featurePath = path.join(outputDir, `${sanitizedName}.feature`);
  fs.writeFileSync(featurePath, result.featureContent, "utf-8");
  console.log(`\n  ✅ Feature: ${featurePath}`);

  const stepsPath = path.join(stepsDir, `${sanitizedName.toLowerCase()}.steps.ts`);
  fs.writeFileSync(stepsPath, result.stepDefinitions, "utf-8");
  console.log(`  ✅ Steps:   ${stepsPath}`);

  const metaPath = path.join(outputDir, `${sanitizedName}.meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify(result.metadata, null, 2), "utf-8");
  console.log(`  📄 Meta:    ${metaPath}`);

  // Step 9: Preview
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 Feature Preview:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  const previewLines = result.featureContent.split("\n").slice(0, 25);
  console.log(previewLines.join("\n"));
  if (result.featureContent.split("\n").length > 25) {
    console.log("\n... (see full file for complete content)");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Generation Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   Mode: Hybrid (Scanner + LLM)`);
  console.log(`   LLM: ${result.metadata.llmModel}`);
  console.log(`   Flow: ${result.metadata.flowName}`);
  console.log(`   Endpoints: ${result.metadata.endpointsUsed.length}`);
  console.log(`   State Transitions: ${result.metadata.stateTransitions.length}`);
  console.log(`   Time: ${result.metadata.generationTime}ms`);
}

// ============================================================================
// Helpers
// ============================================================================

function createLLMClient(provider: string, model?: string): LLMClient {
  switch (provider.toLowerCase()) {
    case "openai":
      return new OpenAIClient(model || "gpt-4");
    case "ollama":
      return new OllamaClient(model || "qwen2.5-coder:7b");
    default:
      console.log(`Unknown LLM provider "${provider}", defaulting to OpenAI`);
      return new OpenAIClient(model || "gpt-4");
  }
}

function toVerbNoun(flowName: string): string {
  const conversions: Record<string, string> = {
    "New Business Submission": "Submit New Business",
    "Policy Cancellation": "Cancel Policy",
    "Policy Change (Endorsement)": "Endorse Policy",
    "Policy Renewal": "Renew Policy",
    "Underwriting Issue Management": "Manage Underwriting Issues",
    "Billing Payment Processing": "Process Billing Payment",
    "Policy Reinstatement": "Reinstate Policy",
    "Rewrite Policy": "Rewrite Policy",
  };

  return conversions[flowName] || flowName;
}

function generateDefaultUserStory(
  flowName: string,
  flows: { name: string; description: string }[],
): string {
  const flow = flows.find((f) => f.name === flowName);
  const description = flow?.description || flowName.toLowerCase();

  const roleMap: Record<string, string> = {
    "New Business Submission": "an Underwriter",
    "Policy Cancellation": "an Underwriter",
    "Policy Change (Endorsement)": "an Underwriter",
    "Policy Renewal": "an Underwriter",
    "Underwriting Issue Management": "an Underwriting Manager",
    "Billing Payment Processing": "a Billing Specialist",
  };

  const benefitMap: Record<string, string> = {
    "New Business Submission": "the policy becomes active and the insured is covered",
    "Policy Cancellation": "the policy is properly terminated and premium is adjusted",
    "Policy Change (Endorsement)": "the policy reflects the updated coverage",
    "Policy Renewal": "continuous coverage is maintained for the insured",
    "Underwriting Issue Management": "risks are properly evaluated before binding",
    "Billing Payment Processing": "the account balance is updated accurately",
  };

  const role = roleMap[flowName] || "a System User";
  const benefit = benefitMap[flowName] || "the business process is completed accurately";

  return `As ${role}, I want to ${description.toLowerCase()}, So that ${benefit}`;
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

async function promptUser(message: string, flows: { name: string }[]): Promise<string> {
  try {
    const inquirer = await import("inquirer");
    const answers = await inquirer.default.prompt([
      {
        type: "list",
        name: "flow",
        message: "Select a business flow:",
        choices: flows.map((f) => f.name),
      },
    ]);
    return answers.flow;
  } catch {
    // Fallback to readline if inquirer not available
    return readlinePrompt(message);
  }
}

async function promptInput(message: string, defaultValue: string): Promise<string> {
  try {
    const inquirer = await import("inquirer");
    const answers = await inquirer.default.prompt([
      {
        type: "input",
        name: "value",
        message,
        default: defaultValue,
      },
    ]);
    return answers.value;
  } catch {
    return defaultValue;
  }
}

function readlinePrompt(message: string): Promise<string> {
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Run
main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
