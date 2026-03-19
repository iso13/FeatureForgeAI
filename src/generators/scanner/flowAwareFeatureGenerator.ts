/**
 * FeatureForgeAI - Flow-Aware Feature Generator
 * Generates BDD features and scenarios that are semantically accurate
 * based on actual API specs and business flow analysis.
 *
 * This is the bridge between API scanning and executable test automation.
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

import {
  ApiEndpoint,
  ApiSpec,
  ScanResult,
} from "./apiSpecScanner";

import {
  BusinessFlow,
  FlowGraph,
  FlowStep,
  FieldMapping,
  CrossCenterDependency,
} from "./apiFlowBuilder";

// ============================================================================
// Types
// ============================================================================

export interface GeneratedFeature {
  fileName: string;
  featureContent: string;
  stepDefinitions: string;
  metadata: FeatureMetadata;
}

export interface FeatureMetadata {
  featureName: string;
  flowName: string;
  category: string;
  complexity: string;
  scenarioCount: number;
  endpointsUsed: string[];
  centersInvolved: string[];
  stateTransitions: string[];
  generatedAt: string;
  generationMode: "api-aware" | "llm-enhanced" | "hybrid";
}

export interface GenerationConfig {
  includeApiTags: boolean;          // Add @api tags to scenarios
  includeUiScenarios: boolean;      // Generate UI-based scenarios too
  includeNegativeScenarios: boolean; // Generate error/negative paths
  includeCrossCenterVerification: boolean; // Add cross-center verification steps
  maxScenariosPerFeature: number;
  tagPrefix: string;                // e.g., "@pc" for PolicyCenter
  scenarioStyle: "concise" | "detailed" | "data-driven";
}

const DEFAULT_CONFIG: GenerationConfig = {
  includeApiTags: true,
  includeUiScenarios: false,
  includeNegativeScenarios: true,
  includeCrossCenterVerification: true,
  maxScenariosPerFeature: 6,
  tagPrefix: "",
  scenarioStyle: "detailed",
};

// ============================================================================
// Flow-Aware Feature Generator
// ============================================================================

export class FlowAwareFeatureGenerator {
  private flowGraph: FlowGraph;
  private scanResult: ScanResult;
  private config: GenerationConfig;

  constructor(
    flowGraph: FlowGraph,
    scanResult: ScanResult,
    config: Partial<GenerationConfig> = {},
  ) {
    this.flowGraph = flowGraph;
    this.scanResult = scanResult;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a feature file from a business flow
   */
  generateFeature(flowName: string): GeneratedFeature | null {
    const flow = this.flowGraph.flows.find(
      (f) => f.name.toLowerCase().includes(flowName.toLowerCase()),
    );

    if (!flow) {
      console.error(`❌ No flow found matching: "${flowName}"`);
      console.log("Available flows:", this.flowGraph.flows.map((f) => f.name).join(", "));
      return null;
    }

    console.log(`\n🔨 Generating feature for: ${flow.name}`);
    console.log(`   Steps: ${flow.steps.length} | Complexity: ${flow.estimatedComplexity}`);

    const featureTag = this.buildFeatureTag(flow.name);
    const featureTitle = this.buildFeatureTitle(flow.name);
    const userStory = this.buildUserStory(flow);
    const background = this.buildBackground(flow);
    const scenarios = this.buildScenarios(flow);
    const stepDefs = this.buildStepDefinitions(flow, scenarios);

    const featureContent = this.assembleFeatureFile(
      featureTag,
      featureTitle,
      userStory,
      background,
      scenarios,
    );

    const fileName = featureTitle.replace(/\s+/g, "");

    const metadata: FeatureMetadata = {
      featureName: featureTitle,
      flowName: flow.name,
      category: flow.category,
      complexity: flow.estimatedComplexity,
      scenarioCount: scenarios.length,
      endpointsUsed: flow.steps.map((s) => `${s.endpoint.method} ${s.endpoint.path}`),
      centersInvolved: [...new Set(flow.steps.map((s) => s.center))],
      stateTransitions: flow.stateTransitions.map(
        (t) => `${t.fromState} → ${t.toState}`,
      ),
      generatedAt: new Date().toISOString(),
      generationMode: "api-aware",
    };

    return {
      fileName,
      featureContent,
      stepDefinitions: stepDefs,
      metadata,
    };
  }

  /**
   * Generate features for ALL flows in the graph
   */
  generateAllFeatures(): GeneratedFeature[] {
    const features: GeneratedFeature[] = [];

    for (const flow of this.flowGraph.flows) {
      const feature = this.generateFeature(flow.name);
      if (feature) {
        features.push(feature);
      }
    }

    console.log(`\n✅ Generated ${features.length} features from ${this.flowGraph.flows.length} flows`);
    return features;
  }

  // ============================================================================
  // Feature File Assembly
  // ============================================================================

  private buildFeatureTag(flowName: string): string {
    const tag = flowName
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^./, (s) => s.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, "");

    return this.config.tagPrefix
      ? `@${this.config.tagPrefix} @${tag}`
      : `@${tag}`;
  }

  private buildFeatureTitle(flowName: string): string {
    // Convert to Verb Noun format
    const words = flowName.split(" ");
    if (words.length >= 2) {
      return flowName; // Already in a good format like "Cancel Policy"
    }
    return `Manage ${flowName}`;
  }

  private buildUserStory(flow: BusinessFlow): string {
    const roleMap: Record<string, string> = {
      "Policy Lifecycle": "an Underwriter",
      Underwriting: "an Underwriter",
      Billing: "a Billing Specialist",
      Claims: "a Claims Adjuster",
      "Auto-Discovered": "a System User",
    };

    const role = roleMap[flow.category] || "a System User";
    const action = flow.description.toLowerCase();
    const benefit = this.inferBenefit(flow);

    return `  As ${role},\n  I want to ${action},\n  So that ${benefit}`;
  }

  private inferBenefit(flow: BusinessFlow): string {
    const benefitMap: Record<string, string> = {
      "New Business Submission": "the policy becomes active and the insured is covered",
      "Policy Cancellation": "the policy is properly terminated and premium is adjusted",
      "Policy Change (Endorsement)": "the policy reflects the updated coverage and premium",
      "Policy Renewal": "continuous coverage is maintained for the insured",
      "Underwriting Issue Management": "risks are properly evaluated before binding",
      "Billing Payment Processing": "the account balance is updated and payment is recorded",
    };

    return benefitMap[flow.name] || "the business process is completed accurately";
  }

  private buildBackground(flow: BusinessFlow): string | null {
    const authSteps: string[] = [];

    // Determine which centers are involved
    const centers = [...new Set(flow.steps.map((s) => s.center))];

    if (centers.length > 0) {
      authSteps.push(`    Given I am authenticated with the ${centers.join(" and ")} API`);
    }

    // Add any setup that's common across all scenarios
    const firstStep = flow.steps[0];
    if (firstStep && firstStep.preconditions.length > 0) {
      for (const condition of firstStep.preconditions) {
        authSteps.push(`    And ${condition.toLowerCase()}`);
      }
    }

    return authSteps.length > 0
      ? `  Background:\n${authSteps.join("\n")}`
      : null;
  }

  private buildScenarios(flow: BusinessFlow): string[] {
    const scenarios: string[] = [];

    // Scenario 1: Happy path - full flow
    scenarios.push(this.buildHappyPathScenario(flow));

    // Scenario 2: API verification of each step
    if (this.config.includeApiTags) {
      scenarios.push(this.buildApiVerificationScenario(flow));
    }

    // Scenario 3: State transition verification
    if (flow.stateTransitions.length > 0) {
      scenarios.push(this.buildStateTransitionScenario(flow));
    }

    // Scenario 4: Cross-center verification
    if (this.config.includeCrossCenterVerification && flow.crossCenterDependencies.length > 0) {
      scenarios.push(this.buildCrossCenterScenario(flow));
    }

    // Scenario 5-6: Negative scenarios
    if (this.config.includeNegativeScenarios) {
      scenarios.push(...this.buildNegativeScenarios(flow));
    }

    return scenarios.slice(0, this.config.maxScenariosPerFeature);
  }

  private buildHappyPathScenario(flow: BusinessFlow): string {
    const lines: string[] = [];
    const tags = ["@happy", "@smoke"];
    if (this.config.includeApiTags) tags.push("@api");

    lines.push(`  ${tags.join(" ")}`);
    lines.push(`  Scenario: ${flow.name} - complete happy path`);

    for (const step of flow.steps.sort((a, b) => a.order - b.order)) {
      const keyword = step.order === 1 ? "Given" : step.order === flow.steps.length ? "Then" : "When";

      if (keyword === "Given") {
        lines.push(this.buildGivenStep(step));
      } else if (keyword === "Then") {
        lines.push(this.buildWhenStep(step));
        lines.push(this.buildThenStep(step, flow));
      } else {
        lines.push(this.buildWhenStep(step));
      }
    }

    return lines.join("\n");
  }

  private buildApiVerificationScenario(flow: BusinessFlow): string {
    const lines: string[] = [];
    lines.push("  @api @integration");
    lines.push(`  Scenario: ${flow.name} - verify API response at each step`);

    for (const step of flow.steps.sort((a, b) => a.order - b.order)) {
      const method = step.endpoint.method;
      const path = step.endpoint.path;

      if (step.order === 1) {
        lines.push(`    Given I send a ${method} request to "${path}"`);
      } else {
        lines.push(`    When I send a ${method} request to "${path}"`);
      }

      // Add required field expectations
      if (step.inputFields.filter((f) => f.required).length > 0) {
        const requiredFields = step.inputFields
          .filter((f) => f.required && f.source === "user_input")
          .map((f) => f.fieldName);

        if (requiredFields.length > 0) {
          lines.push(`    And the request body includes ${requiredFields.join(", ")}`);
        }
      }

      // Add response expectations
      lines.push(`    Then the response status should be 200 or 201`);

      if (step.provides.length > 0) {
        lines.push(`    And the response should contain ${step.provides.join(", ")}`);
      }
    }

    return lines.join("\n");
  }

  private buildStateTransitionScenario(flow: BusinessFlow): string {
    const lines: string[] = [];
    lines.push("  @stateTransition @audit");
    lines.push(`  Scenario: ${flow.name} - verify state transitions`);

    for (const transition of flow.stateTransitions) {
      lines.push(`    Given the entity is in "${transition.fromState}" state`);

      if (transition.conditions.length > 0) {
        for (const condition of transition.conditions) {
          lines.push(`    And ${condition.toLowerCase()}`);
        }
      }

      lines.push(`    When the "${transition.trigger}" operation is executed`);
      lines.push(`    Then the entity should transition to "${transition.toState}" state`);
    }

    return lines.join("\n");
  }

  private buildCrossCenterScenario(flow: BusinessFlow): string {
    const lines: string[] = [];
    lines.push("  @crossCenter @integration");
    lines.push(`  Scenario: ${flow.name} - verify cross-center effects`);

    // Setup
    lines.push(`    Given the ${flow.name.toLowerCase()} process has been completed in ${flow.steps[0]?.center || "the primary center"}`);

    // Verify cross-center effects
    for (const dep of flow.crossCenterDependencies) {
      lines.push(`    Then the ${dep.toCenter} should reflect the changes via API`);
      lines.push(`    And the ${dep.sharedField} should be synchronized between ${dep.fromCenter} and ${dep.toCenter}`);
    }

    return lines.join("\n");
  }

  private buildNegativeScenarios(flow: BusinessFlow): string[] {
    const scenarios: string[] = [];

    // Missing required fields scenario
    const stepsWithRequiredFields = flow.steps.filter(
      (s) => s.inputFields.filter((f) => f.required && f.source === "user_input").length > 0,
    );

    if (stepsWithRequiredFields.length > 0) {
      const step = stepsWithRequiredFields[0];
      const requiredField = step.inputFields.find((f) => f.required && f.source === "user_input");

      if (requiredField) {
        const lines: string[] = [];
        lines.push("  @negative @validation");
        lines.push(`  Scenario: ${flow.name} - fails when ${requiredField.fieldName} is missing`);
        lines.push(`    Given I am initiating the ${flow.name.toLowerCase()} process`);
        lines.push(`    When I send a ${step.endpoint.method} request to "${step.endpoint.path}" without ${requiredField.fieldName}`);
        lines.push(`    Then the response status should be 400`);
        lines.push(`    And the response should contain a validation error for "${requiredField.fieldName}"`);
        scenarios.push(lines.join("\n"));
      }
    }

    // Invalid state transition scenario
    if (flow.stateTransitions.length > 0) {
      const transition = flow.stateTransitions[0];
      const lines: string[] = [];
      lines.push("  @negative @stateGuard");
      lines.push(`  Scenario: ${flow.name} - fails when entity is not in required state`);
      lines.push(`    Given the entity is NOT in "${transition.fromState}" state`);
      lines.push(`    When the "${transition.trigger}" operation is attempted`);
      lines.push(`    Then the operation should be rejected`);
      lines.push(`    And the error should indicate the entity must be in "${transition.fromState}" state`);
      scenarios.push(lines.join("\n"));
    }

    return scenarios;
  }

  // ============================================================================
  // Step Building Helpers
  // ============================================================================

  private buildGivenStep(step: FlowStep): string {
    const userInputFields = step.inputFields.filter(
      (f) => f.source === "user_input" && f.required,
    );

    if (userInputFields.length > 0) {
      const fieldList = userInputFields.map((f) => {
        if (f.enumValues && f.enumValues.length > 0) {
          return `${f.fieldName} "${f.enumValues[0]}"`;
        }
        return `valid ${f.fieldName}`;
      }).join(" and ");

      return `    Given I have ${fieldList} for ${step.description.toLowerCase()}`;
    }

    return `    Given ${step.description}`;
  }

  private buildWhenStep(step: FlowStep): string {
    return `    When I ${step.description.toLowerCase()} via ${step.center} API`;
  }

  private buildThenStep(step: FlowStep, flow: BusinessFlow): string {
    const lines: string[] = [];

    if (step.provides.length > 0) {
      lines.push(`    Then I should receive ${step.provides.join(" and ")} in the response`);
    }

    // Add final state check
    const finalTransition = flow.stateTransitions[flow.stateTransitions.length - 1];
    if (finalTransition) {
      lines.push(`    And the entity should be in "${finalTransition.toState}" state`);
    }

    return lines.join("\n");
  }

  // ============================================================================
  // Feature File Assembly
  // ============================================================================

  private assembleFeatureFile(
    tag: string,
    title: string,
    userStory: string,
    background: string | null,
    scenarios: string[],
  ): string {
    const parts: string[] = [];

    parts.push(tag);
    parts.push(`Feature: ${title}`);
    parts.push(userStory);
    parts.push("");

    if (background) {
      parts.push(background);
      parts.push("");
    }

    for (const scenario of scenarios) {
      parts.push(scenario);
      parts.push("");
    }

    return parts.join("\n");
  }

  // ============================================================================
  // Step Definition Generation
  // ============================================================================

  private buildStepDefinitions(flow: BusinessFlow, scenarios: string[]): string {
    const lines: string[] = [];

    lines.push(`// Step definitions for: ${flow.name}`);
    lines.push(`// Auto-generated by FeatureForgeAI Flow-Aware Generator`);
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push(`// Endpoints used: ${flow.steps.map((s) => s.endpoint.path).join(", ")}`);
    lines.push("");
    lines.push(`import { Given, When, Then } from "@cucumber/cucumber";`);
    lines.push(`import { CustomWorld } from "../support/world";`);
    lines.push(`import { expect } from "@playwright/test";`);
    lines.push("");

    // Generate step definitions for each unique step pattern
    const generatedPatterns = new Set<string>();

    for (const step of flow.steps) {
      // Given step for setup
      const givenPattern = `I have .* for ${step.description.toLowerCase()}`;
      if (!generatedPatterns.has(givenPattern)) {
        generatedPatterns.add(givenPattern);
        lines.push(this.buildGivenStepDefinition(step));
        lines.push("");
      }

      // When step for action
      const whenPattern = `I ${step.description.toLowerCase()} via ${step.center} API`;
      if (!generatedPatterns.has(whenPattern)) {
        generatedPatterns.add(whenPattern);
        lines.push(this.buildWhenStepDefinition(step));
        lines.push("");
      }
    }

    // Then steps for verification
    lines.push(this.buildCommonThenStepDefinitions(flow));

    return lines.join("\n");
  }

  private buildGivenStepDefinition(step: FlowStep): string {
    const requiredFields = step.inputFields
      .filter((f) => f.required && f.source === "user_input")
      .map((f) => f.fieldName);

    return [
      `Given("I have valid data for ${step.description.toLowerCase()}", async function (this: CustomWorld) {`,
      `  // Required fields: ${requiredFields.join(", ") || "none (all from previous steps)"}`,
      `  // Endpoint: ${step.endpoint.method} ${step.endpoint.path}`,
      `  // Center: ${step.center}`,
      requiredFields.length > 0
        ? `  this.requestPayload = {\n${requiredFields.map((f) => `    ${f}: "test-value", // TODO: Replace with test data`).join("\n")}\n  };`
        : `  // No user input required - data flows from previous steps`,
      `});`,
    ].join("\n");
  }

  private buildWhenStepDefinition(step: FlowStep): string {
    const pathParams = step.endpoint.pathDependencies;

    return [
      `When("I ${step.description.toLowerCase()} via ${step.center} API", async function (this: CustomWorld) {`,
      `  // ${step.endpoint.method} ${step.endpoint.path}`,
      pathParams.length > 0
        ? `  // Path parameters needed: ${pathParams.join(", ")}`
        : "",
      `  const endpoint = "${step.endpoint.path}"${pathParams.length > 0 ? `.replace("{${pathParams[0]}}", this.${pathParams[0]})` : ""};`,
      ``,
      step.endpoint.method === "GET"
        ? `  const response = await this.apiClient.get(endpoint);`
        : `  const response = await this.apiClient.${step.endpoint.method.toLowerCase()}(endpoint, this.requestPayload);`,
      ``,
      `  expect(response.status).toBeLessThan(300);`,
      `  this.lastResponse = response.data;`,
      step.provides.length > 0
        ? `\n  // Store outputs for downstream steps\n${step.provides.map((p) => `  this.${p} = response.data.data?.attributes?.${p} || response.data.${p};`).join("\n")}`
        : "",
      `});`,
    ]
      .filter((l) => l !== "")
      .join("\n");
  }

  private buildCommonThenStepDefinitions(flow: BusinessFlow): string {
    const lines: string[] = [];

    // Response field verification
    lines.push(`Then("I should receive {string} in the response", async function (this: CustomWorld, fieldName: string) {`);
    lines.push(`  expect(this.lastResponse).toBeDefined();`);
    lines.push(`  const value = this.lastResponse.data?.attributes?.[fieldName] || this.lastResponse[fieldName];`);
    lines.push(`  expect(value).toBeDefined();`);
    lines.push(`});`);
    lines.push("");

    // State verification
    if (flow.stateTransitions.length > 0) {
      lines.push(`Then("the entity should be in {string} state", async function (this: CustomWorld, expectedState: string) {`);
      lines.push(`  const status = this.lastResponse.data?.attributes?.status || this.lastResponse.status;`);
      lines.push(`  expect(status).toBe(expectedState);`);
      lines.push(`});`);
      lines.push("");
    }

    // Response status verification
    lines.push(`Then("the response status should be {int}", async function (this: CustomWorld, expectedStatus: number) {`);
    lines.push(`  expect(this.lastResponseStatus).toBe(expectedStatus);`);
    lines.push(`});`);

    return lines.join("\n");
  }

  // ============================================================================
  // Utility: Generate a summary report
  // ============================================================================

  generateSummaryReport(): string {
    const lines: string[] = [];

    lines.push("# FeatureForgeAI - Flow-Aware Generation Report");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Source Specs: ${this.scanResult.centers.join(", ")}`);
    lines.push("");
    lines.push(`## Available Flows (${this.flowGraph.flows.length})`);
    lines.push("");

    for (const flow of this.flowGraph.flows) {
      lines.push(`### ${flow.name}`);
      lines.push(`- Category: ${flow.category}`);
      lines.push(`- Complexity: ${flow.estimatedComplexity}`);
      lines.push(`- Steps: ${flow.steps.length}`);
      lines.push(`- State Transitions: ${flow.stateTransitions.length}`);
      lines.push(`- Cross-Center: ${flow.crossCenterDependencies.length > 0 ? "Yes" : "No"}`);
      lines.push(`- Endpoints:`);
      for (const step of flow.steps) {
        lines.push(`  - ${step.endpoint.method} ${step.endpoint.path} (${step.center})`);
      }
      lines.push("");
    }

    lines.push("## Cross-Center Dependencies");
    for (const dep of this.flowGraph.crossCenterMap) {
      lines.push(`- ${dep.fromCenter} → ${dep.toCenter}: ${dep.description}`);
    }

    return lines.join("\n");
  }
}
