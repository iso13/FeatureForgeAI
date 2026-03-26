/**
 * FeatureForge AI - Hybrid Generator
 * Combines API Flow Engine intelligence with LLM generation
 * to produce declarative, business-readable BDD features
 * that are backed by real API endpoint data.
 *
 * Scanner provides: endpoint chains, fields, state transitions, preconditions
 * LLM provides: declarative language, business readability, edge case scenarios
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

import type {
  BusinessFlow,
  FlowStep,
  FlowGraph,
  StateTransition,
  CrossCenterDependency,
} from "./apiFlowBuilder.js";

import type { ScanResult } from "./apiSpecScanner.js";

// ============================================================================
// Types
// ============================================================================

export interface HybridGenerationRequest {
  featureTitle: string;        // Verb Noun format: "Submit New Business"
  userStory: string;           // As a... I want... So that...
  scenarioCount: number;       // 2-6
  flowName: string;            // Must match a discovered flow
  tags?: string[];             // Additional tags
  includeNegativeScenarios?: boolean;
  includeCrossCenterVerification?: boolean;
}

export interface HybridGenerationResult {
  featureContent: string;
  stepDefinitions: string;
  metadata: {
    featureTitle: string;
    flowName: string;
    generationMode: "hybrid";
    endpointsUsed: string[];
    stateTransitions: string[];
    llmModel: string;
    generationTime: number;
  };
}

export interface FlowContext {
  flowName: string;
  flowDescription: string;
  category: string;
  complexity: string;
  steps: FlowStepContext[];
  stateTransitions: StateTransition[];
  crossCenterEffects: CrossCenterDependency[];
  requiredFields: string[];
  outputFields: string[];
}

export interface FlowStepContext {
  order: number;
  action: string;           // Human-readable: "Create a new draft submission"
  endpoint: string;         // "POST /submissions"
  center: string;           // "PolicyCenter"
  inputFields: string[];    // Fields this step needs
  outputFields: string[];   // Fields this step produces
  dependsOn: string[];      // What must happen before this
  preconditions: string[];
}

// ============================================================================
// Flow Context Builder
// ============================================================================

/**
 * Transforms raw scanner flow data into a structured context
 * that can be injected into an LLM prompt.
 */
export function buildFlowContext(flow: BusinessFlow): FlowContext {
  return {
    flowName: flow.name,
    flowDescription: flow.description,
    category: flow.category,
    complexity: flow.estimatedComplexity,
    steps: flow.steps
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        order: step.order,
        action: step.description,
        endpoint: `${step.endpoint.method} ${step.endpoint.path}`,
        center: step.center,
        inputFields: step.inputFields
          .filter((f) => f.required)
          .map((f) => f.fieldName),
        outputFields: step.provides,
        dependsOn: step.dependsOn,
        preconditions: step.preconditions,
      })),
    stateTransitions: flow.stateTransitions,
    crossCenterEffects: flow.crossCenterDependencies,
    requiredFields: flow.steps.flatMap((s) =>
      s.inputFields.filter((f) => f.required && f.source === "user_input").map((f) => f.fieldName),
    ),
    outputFields: flow.steps.flatMap((s) => s.provides),
  };
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Builds the LLM prompt that combines declarative BDD guidelines
 * with verified API flow data from the scanner.
 */
export function buildHybridFeaturePrompt(
  request: HybridGenerationRequest,
  context: FlowContext,
): string {
  const tag = `@${request.featureTitle
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (s) => s.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, "")}`;

  const stepsDescription = context.steps
    .map((s) => `  ${s.order}. ${s.action} (${s.endpoint} via ${s.center})`)
    .join("\n");

  const stateTransitionDescription = context.stateTransitions
    .map((t) => `  - ${t.fromState} → ${t.toState} (triggered by: ${t.trigger})${t.conditions.length > 0 ? ` [requires: ${t.conditions.join(", ")}]` : ""}`)
    .join("\n");

  const crossCenterDescription = context.crossCenterEffects.length > 0
    ? context.crossCenterEffects
        .map((d) => `  - ${d.fromCenter} → ${d.toCenter}: ${d.description}`)
        .join("\n")
    : "  None";

  return `You MUST generate a Cucumber BDD feature file using ONLY declarative, business-readable language.

ABSOLUTE RULES:
- NEVER use "I" statements. Use "the underwriter", "the system", "the policy" as subjects.
- NEVER include API paths, HTTP methods, or technical endpoints in the feature file.
- NEVER use imperative terms: click, enter, fill, navigate, select, type, submit button.
- ALWAYS focus on BUSINESS OUTCOMES and WHAT happens, not HOW it happens technically.
- ALWAYS use Verb Noun format for the feature title.
- Each step must be declarative and implementation-agnostic.

FEATURE DETAILS:
Feature Tag: "${tag}"
Feature Title: "${request.featureTitle}"
User Story: "${request.userStory}"
Number of Scenarios: ${request.scenarioCount}
${request.tags ? `Additional Tags: ${request.tags.join(" ")}` : ""}

VERIFIED BUSINESS FLOW (from API analysis - use this as the source of truth):
Flow: ${context.flowName}
Description: ${context.flowDescription}
Category: ${context.category}
Complexity: ${context.complexity}

Steps in order:
${stepsDescription}

State Transitions:
${stateTransitionDescription}

Cross-Center Effects:
${crossCenterDescription}

SCENARIO REQUIREMENTS:
1. Scenario 1: Happy path covering the full business flow above
2. Scenario 2: Verification that each step in the flow produces the expected business outcome
${request.includeNegativeScenarios !== false ? `3. Scenario 3: Negative path - what happens when a required precondition is not met
4. Scenario 4: Negative path - what happens when the entity is in the wrong state` : ""}
${request.includeCrossCenterVerification && context.crossCenterEffects.length > 0 ? `5. Cross-center verification - confirm downstream systems reflect the changes` : ""}

DECLARATIVE STEP EXAMPLES (follow this style):
Good:
  Given a new account is established for the insured
  And a submission is created for the "Farm" line of business
  When the submission is quoted
  Then the quoted premium should be calculated
  And the submission should be in "Quoted" status

  Given the policy has been bound
  When the policy is issued
  Then the billing account should be created in BillingCenter
  And the policy should be in "Issued" status

Bad (DO NOT generate steps like these):
  When I send a POST request to "/submissions"
  When the user clicks the Quote button
  Then the response status should be 200

OUTPUT FORMAT:
- Start with the tag on line 1
- Feature title on line 2
- User story as As a / I want / So that
- Background section for common setup
- Each scenario with appropriate tags (@happy, @negative, @crossCenter, @stateTransition)
- Generate ONLY the feature file content, no explanations`;
}

/**
 * Builds the LLM prompt for generating step definitions
 * that wire into the actual API endpoints discovered by the scanner.
 */
export function buildHybridStepDefinitionsPrompt(
  request: HybridGenerationRequest,
  context: FlowContext,
  featureContent: string,
  projectContext?: ProjectContext,
): string {
  const worldProperties = projectContext?.worldProperties?.join("\n  ") || "// No project context provided";
  const existingImports = projectContext?.commonImports?.join("\n") || "";
  const apiClientPattern = projectContext?.apiClientPattern || "this.apiClient.post(endpoint, payload)";

  return `Generate TypeScript Cucumber step definitions for the following feature file.

RULES:
- Import from "@cucumber/cucumber" and "@playwright/test"
- Use CustomWorld with "this: CustomWorld" typing
- Use async/await for all steps
- Wire each business step to the correct API endpoint from the flow data below
- Store response data on the world object for downstream steps
- Follow the project's existing patterns shown below

FEATURE FILE:
${featureContent}

API FLOW DATA (use these real endpoints in the step definitions):
${context.steps.map((s) => `Step ${s.order}: "${s.action}"
  Endpoint: ${s.endpoint}
  Center: ${s.center}
  Inputs: ${s.inputFields.join(", ") || "none"}
  Outputs: ${s.outputFields.join(", ") || "none"}
  Preconditions: ${s.preconditions.join(", ") || "none"}`).join("\n\n")}

STATE TRANSITIONS:
${context.stateTransitions.map((t) => `${t.fromState} → ${t.toState}: ${t.trigger}`).join("\n")}

PROJECT CONTEXT:
World properties available:
  ${worldProperties}

Common imports:
${existingImports}

API client pattern:
  ${apiClientPattern}

OUTPUT RULES:
- Generate ONLY TypeScript code, no markdown, no explanations
- Each Given/When/Then step from the feature must have a matching definition
- Use the actual API endpoints from the flow data
- Store outputs (${context.outputFields.join(", ")}) on the world object
- Include proper error handling`;
}

// ============================================================================
// Project Context (reads from existing codebase)
// ============================================================================

export interface ProjectContext {
  worldProperties: string[];      // Properties on CustomWorld
  commonImports: string[];        // Standard import lines
  apiClientPattern: string;       // How API calls are made
  existingStepPatterns: string[]; // Steps that already exist (avoid duplicates)
}

/**
 * Scans the project to build context for step definition generation.
 * This ensures generated code matches the project's conventions.
 */
export async function scanProjectContext(projectRoot: string): Promise<ProjectContext> {
  const fs = await import("fs");
  const path = await import("path");

  const context: ProjectContext = {
    worldProperties: [],
    commonImports: [],
    apiClientPattern: "this.apiClient.post(endpoint, payload)",
    existingStepPatterns: [],
  };

  // Scan world.ts for properties
  const worldPaths = [
    path.join(projectRoot, "src/core/support/world.ts"),
    path.join(projectRoot, "src/core/support/world.type.ts"),
  ];

  for (const worldPath of worldPaths) {
    if (fs.existsSync(worldPath)) {
      const worldContent = fs.readFileSync(worldPath, "utf-8");

      // Extract property declarations
      const propertyMatches = worldContent.matchAll(
        /(?:public|private|protected)?\s+([\w]+)\s*[?!]?\s*:\s*([^;=]+)/g,
      );
      for (const match of propertyMatches) {
        context.worldProperties.push(`${match[1]}: ${match[2].trim()}`);
      }

      // Extract common imports
      const importMatches = worldContent.matchAll(/^import\s+.*$/gm);
      for (const match of importMatches) {
        context.commonImports.push(match[0]);
      }
      break;
    }
  }

  // Scan existing step files for patterns (avoid duplicates)
  const stepDirs = [
    path.join(projectRoot, "src/core/steps"),
    path.join(projectRoot, "src/steps"),
    path.join(projectRoot, "src/implementations"),
  ];

  for (const stepDir of stepDirs) {
    if (fs.existsSync(stepDir)) {
      const files = walkDir(stepDir).filter((f) => f.endsWith(".steps.ts"));
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const stepMatches = content.matchAll(
          /(?:Given|When|Then)\s*\(\s*["'`]([^"'`]+)["'`]/g,
        );
        for (const match of stepMatches) {
          context.existingStepPatterns.push(match[1]);
        }
      }
    }
  }

  return context;
}

function walkDir(dir: string): string[] {
  const fs = require("fs");
  const path = require("path");
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// ============================================================================
// Hybrid Generator (orchestrates the full flow)
// ============================================================================

export class HybridGenerator {
  private flowGraph: FlowGraph;
  private scanResult: ScanResult;
  private llmClient: LLMClient;
  private projectContext: ProjectContext | null = null;

  constructor(
    flowGraph: FlowGraph,
    scanResult: ScanResult,
    llmClient: LLMClient,
  ) {
    this.flowGraph = flowGraph;
    this.scanResult = scanResult;
    this.llmClient = llmClient;
  }

  /**
   * Load project context for smarter step definition generation
   */
  async loadProjectContext(projectRoot: string): Promise<void> {
    this.projectContext = await scanProjectContext(projectRoot);
    console.log(`  📚 Project context loaded:`);
    console.log(`     World properties: ${this.projectContext.worldProperties.length}`);
    console.log(`     Existing step patterns: ${this.projectContext.existingStepPatterns.length}`);
  }

  /**
   * Generate a feature + step definitions using hybrid mode
   */
  async generate(request: HybridGenerationRequest): Promise<HybridGenerationResult> {
    const startTime = Date.now();

    // 1. Find the matching flow from the scanner
    const flow = this.flowGraph.flows.find(
      (f) => f.name.toLowerCase().includes(request.flowName.toLowerCase()),
    );

    if (!flow) {
      throw new Error(
        `Flow "${request.flowName}" not found. Available: ${this.flowGraph.flows.map((f) => f.name).join(", ")}`,
      );
    }

    console.log(`\n🔀 Hybrid Generation: ${request.featureTitle}`);
    console.log(`   Scanner flow: ${flow.name} (${flow.steps.length} steps)`);
    console.log(`   LLM: ${this.llmClient.modelName}`);

    // 2. Build flow context from scanner data
    const context = buildFlowContext(flow);

    // 3. Generate feature file via LLM with scanner context
    console.log("   📝 Generating declarative feature via LLM...");
    const featurePrompt = buildHybridFeaturePrompt(request, context);
    const featureContent = await this.llmClient.generate(featurePrompt);
    const cleanedFeature = this.cleanFeatureOutput(featureContent, request.featureTitle);

    // 4. Generate step definitions via LLM with scanner context + project context
    console.log("   🔧 Generating step definitions via LLM...");
    const stepsPrompt = buildHybridStepDefinitionsPrompt(
      request,
      context,
      cleanedFeature,
      this.projectContext || undefined,
    );
    const stepDefinitions = await this.llmClient.generate(stepsPrompt);
    const cleanedSteps = this.cleanStepDefinitionsOutput(stepDefinitions);

    const generationTime = Date.now() - startTime;
    console.log(`   ✅ Generated in ${generationTime}ms`);

    return {
      featureContent: cleanedFeature,
      stepDefinitions: cleanedSteps,
      metadata: {
        featureTitle: request.featureTitle,
        flowName: flow.name,
        generationMode: "hybrid",
        endpointsUsed: flow.steps.map((s) => `${s.endpoint.method} ${s.endpoint.path}`),
        stateTransitions: flow.stateTransitions.map((t) => `${t.fromState} → ${t.toState}`),
        llmModel: this.llmClient.modelName,
        generationTime,
      },
    };
  }

  /**
   * List available flows for the user to select from
   */
  listAvailableFlows(): { name: string; description: string; steps: number; complexity: string }[] {
    return this.flowGraph.flows
      .filter((f) => f.category !== "Auto-Discovered")
      .map((f) => ({
        name: f.name,
        description: f.description,
        steps: f.steps.length,
        complexity: f.estimatedComplexity,
      }));
  }

  // ============================================================================
  // Output Cleaning
  // ============================================================================

  private cleanFeatureOutput(raw: string, featureTitle: string): string {
    let cleaned = raw
      .replace(/```gherkin|```feature|```/g, "")
      .trim();

    // Remove any preamble before the tag or Feature:
    cleaned = cleaned.replace(/^.*?(?=@|Feature:)/s, "");

    // Remove trailing explanations
    const explanationIndex = cleaned.search(
      /\bThis feature file\b|\bNote:\b|\bAll steps\b|\bIn this feature\b/i,
    );
    if (explanationIndex !== -1) {
      cleaned = cleaned.slice(0, explanationIndex).trim();
    }

    // Ensure first step after Scenario is Given, not And
    cleaned = cleaned.replace(/(Scenario:.*?\n)(\s*)And\b/g, "$1$2Given");

    return cleaned;
  }

  private cleanStepDefinitionsOutput(raw: string): string {
    let cleaned = raw
      .replace(/```typescript|```ts|```/g, "")
      .trim();

    // Find the first import statement
    const importIndex = cleaned.indexOf("import");
    if (importIndex > 0) {
      cleaned = cleaned.substring(importIndex);
    }

    // Remove trailing explanations
    const explanationIndex = cleaned.search(
      /\bThese step definitions\b|\bNote:\b|\bMake sure\b/i,
    );
    if (explanationIndex !== -1) {
      cleaned = cleaned.slice(0, explanationIndex).trim();
    }

    return cleaned;
  }
}

// ============================================================================
// LLM Client Interface
// ============================================================================

/**
 * Abstract LLM client - can be backed by OpenAI, Ollama, or Claude
 */
export interface LLMClient {
  modelName: string;
  generate(prompt: string): Promise<string>;
}

/**
 * OpenAI-backed LLM client
 */
export class OpenAIClient implements LLMClient {
  modelName: string;
  private apiKey: string;

  constructor(model: string = "gpt-4", apiKey?: string) {
    this.modelName = model;
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  async generate(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

/**
 * Ollama-backed LLM client (self-hosted)
 */
export class OllamaClient implements LLMClient {
  modelName: string;
  private baseUrl: string;

  constructor(model: string = "qwen2.5-coder:7b", baseUrl?: string) {
    this.modelName = model;
    this.baseUrl = baseUrl || process.env.OLLAMA_URL || "http://localhost:11434";
  }

  async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        stream: false,
        options: { temperature: 0.2, num_predict: 4096 },
      }),
    });

    const data = await response.json();
    return data.response || "";
  }
}
