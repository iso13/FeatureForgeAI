// src/generators/scanner/hybridGenerator.ts
/**
 * FeatureForge AI - Hybrid Generator
 * Combines API Flow Engine intelligence with LLM generation
 * to produce declarative, business-readable BDD features
 * backed by real API endpoint data.
 *
 * Supports: OpenAI (cloud) and Ollama (local/self-hosted)
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

import OpenAI from "openai";
import type { FlowGraph, BusinessFlow, FlowStep } from "./apiFlowBuilder.js";
import type { ScanResult } from "./apiSpecScanner.js";

// ============================================================================
// Types
// ============================================================================

export interface HybridGenerationRequest {
  featureTitle: string;
  userStory: string;
  scenarioCount: number;
  flowName: string;
  tags?: string[];
  includeNegativeScenarios?: boolean;
  includeCrossCenterVerification?: boolean;
}

export interface HybridGenerationResult {
  featureContent: string;
  stepDefinitions: string;
  metadata: {
    flowName: string;
    endpointCount: number;
    scenarioCount: number;
    provider: string;
    generationTimeMs: number;
  };
}

export interface LLMClient {
  generate(prompt: string, systemPrompt: string): Promise<string>;
}

// ============================================================================
// OpenAI Client
// ============================================================================

export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(model = "gpt-4o") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set in environment");
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  }
}

// ============================================================================
// Ollama Client (local)
// ============================================================================

export class OllamaClient implements LLMClient {
  private baseUrl: string;
  private model: string;

  constructor(
    model = "llama3.2",
    baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: `${systemPrompt}\n\n${prompt}`,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response?.trim() ?? "";
  }
}

// ============================================================================
// Flow Context Builder
// ============================================================================

export function buildFlowContext(
  flow: BusinessFlow,
  flowGraph: FlowGraph,
): string {
  const steps = flow.steps
    .map((step: FlowStep, i: number) => {
      const lines = [
        `Step ${i + 1}: ${step.name}`,
        `  Method: ${(step.method ?? "GET").toUpperCase()} ${step.endpoint ?? ""}`,
      ];
      if (step.requiredFields?.length) {
        lines.push(`  Required fields: ${step.requiredFields.join(", ")}`);
      }
      if (step.optionalFields?.length) {
        lines.push(`  Optional fields: ${step.optionalFields.slice(0, 5).join(", ")}`);
      }
      if (step.validStates?.length) {
        lines.push(`  Valid states: ${step.validStates.join(", ")}`);
      }
      if (step.successStates?.length) {
        lines.push(`  Success states: ${step.successStates.join(", ")}`);
      }
      if (step.dependsOn?.length) {
        lines.push(`  Depends on: ${step.dependsOn.join(", ")}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const crossCenter =
    flow.crossCenterEffects?.length
      ? `\nCross-center effects:\n${flow.crossCenterEffects
          .map((e) => `  - ${e.sourceCenter} → ${e.targetCenter}: ${e.description}`)
          .join("\n")}`
      : "";

  const stateTransitions =
    flow.stateTransitions?.length
      ? `\nState transitions:\n${flow.stateTransitions
          .map((t) => `  ${t.from} → ${t.to} (trigger: ${t.trigger})`)
          .join("\n")}`
      : "";

  return `Business Flow: ${flow.name}
Description: ${flow.description}
Center: ${flow.center}
Priority: ${flow.priority}

API Steps:
${steps}${crossCenter}${stateTransitions}`;
}

// ============================================================================
// Hybrid Generator
// ============================================================================

export class HybridGenerator {
  private llmClient: LLMClient;
  private providerName: string;

  constructor(llmClient?: LLMClient) {
    if (llmClient) {
      this.llmClient = llmClient;
      this.providerName = "custom";
    } else {
      const provider = process.env.LLM_PROVIDER ?? "openai";
      if (provider === "ollama") {
        const model = process.env.OLLAMA_MODEL ?? "llama3.2";
        this.llmClient = new OllamaClient(model);
        this.providerName = `ollama:${model}`;
      } else {
        const model = process.env.OPENAI_MODEL ?? "gpt-4o";
        this.llmClient = new OpenAIClient(model);
        this.providerName = `openai:${model}`;
      }
    }
  }

  async generate(
    request: HybridGenerationRequest,
    flowGraph: FlowGraph,
    _scanResult?: ScanResult,
  ): Promise<HybridGenerationResult> {
    const startTime = Date.now();

    const flow = flowGraph.flows.find(
      (f) =>
        f.name.toLowerCase() === request.flowName.toLowerCase() ||
        f.name.toLowerCase().includes(request.flowName.toLowerCase()),
    );

    if (!flow) {
      throw new Error(
        `Flow "${request.flowName}" not found. Available flows: ${flowGraph.flows.map((f) => f.name).join(", ")}`,
      );
    }

    const flowContext = buildFlowContext(flow, flowGraph);
    const tags = ["@generated", `@${(flow.center ?? "generated").toLowerCase()}`, ...(request.tags ?? [])].join(" ");

    const systemPrompt = this.buildSystemPrompt();
    const featurePrompt = this.buildFeaturePrompt(request, flowContext, tags);
    const stepsPrompt = this.buildStepsPrompt(request, flowContext, flow);

    console.log(`\n🤖 Generating with ${this.providerName}...`);
    console.log(`📋 Flow: ${flow.name} (${flow.steps.length} API steps)`);

    const [featureContent, stepDefinitions] = await Promise.all([
      this.llmClient.generate(featurePrompt, systemPrompt),
      this.llmClient.generate(stepsPrompt, systemPrompt),
    ]);

    return {
      featureContent: this.cleanOutput(featureContent),
      stepDefinitions: this.cleanOutput(stepDefinitions),
      metadata: {
        flowName: flow.name,
        endpointCount: flow.steps.length,
        scenarioCount: request.scenarioCount,
        provider: this.providerName,
        generationTimeMs: Date.now() - startTime,
      },
    };
  }

  private buildSystemPrompt(): string {
    return `You are an expert BDD test engineer specializing in enterprise software testing.
You generate declarative, business-readable Gherkin feature files and Cucumber TypeScript step definitions.

CRITICAL RULES:
- Steps must be DECLARATIVE (business language), never imperative (UI actions)
- CORRECT: "When the agent submits a new business application"
- WRONG: "When I click the Submit button"
- CORRECT: "Then the policy should be created in PolicyCenter"
- WRONG: "Then I should see a success message"
- Use exact field names and endpoint paths from the API context provided
- Every scenario must map to real API operations from the flow
- Step definitions must use the CustomWorld interface pattern
- Import from @support/world not relative paths
- Output ONLY the requested content, no explanations or markdown fences`;
  }

  private buildFeaturePrompt(
    request: HybridGenerationRequest,
    flowContext: string,
    tags: string,
  ): string {
    const negativeNote = request.includeNegativeScenarios
      ? `Include ${Math.ceil(request.scenarioCount / 3)} negative/error scenarios.`
      : "Focus on happy path and edge cases only.";

    const crossCenterNote = request.includeCrossCenterVerification
      ? "Include cross-center verification steps where relevant."
      : "";

    return `Generate a Gherkin feature file for the following business flow.

API FLOW CONTEXT:
${flowContext}

GENERATION REQUEST:
Feature Title: ${request.featureTitle}
User Story: ${request.userStory}
Number of Scenarios: ${request.scenarioCount}
Tags: ${tags}
${negativeNote}
${crossCenterNote}

OUTPUT FORMAT (follow exactly):
${tags}
Feature: ${request.featureTitle}
  ${request.userStory}

  Background:
    Given [authentication/setup steps using API context]

  Scenario: [declarative scenario name]
    Given [precondition using business language]
    When [action using business language]
    Then [outcome using business language]
    And [additional verification if needed]

Generate exactly ${request.scenarioCount} scenarios. Use declarative business language only.`;
  }

  private buildStepsPrompt(
    request: HybridGenerationRequest,
    flowContext: string,
    flow: BusinessFlow,
  ): string {
    const endpointList = flow.steps
      .map((s: FlowStep) => `  // ${(s.method ?? "GET").toUpperCase()} ${s.endpoint ?? ""}`)
      .join("\n");

    return `Generate Cucumber TypeScript step definitions for the feature: "${request.featureTitle}"

API FLOW CONTEXT:
${flowContext}

TYPESCRIPT PATTERNS TO FOLLOW:
- Import: import { Given, When, Then } from "@cucumber/cucumber"
- Import: import type { CustomWorld } from "@support/world"
- Use: async function(this: CustomWorld)
- API calls use: this.apiClient.get/post/patch/delete
- Store responses: this.apiResponse = await this.apiClient.post(...)
- Assertions use: expect from chai

ENDPOINTS AVAILABLE:
${endpointList}

Generate complete, working step definitions that:
1. Map to the declarative Gherkin steps
2. Use the actual API endpoints from the flow context
3. Follow the TypeScript patterns above
4. Include proper error handling
5. Store relevant data in CustomWorld for use across steps`;
  }

  private cleanOutput(raw: string): string {
    return raw
      .replace(/^```[a-z]*\n?/gm, "")
      .replace(/^```\n?/gm, "")
      .trim();
  }
}
