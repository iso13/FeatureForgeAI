/**
 * FeatureForgeAI - API Flow Builder
 * Analyzes endpoint dependencies, infers business flows, and builds
 * a dependency graph that maps the actual API call chains.
 *
 * This is the "brain" that turns raw API specs into business flow knowledge.
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

import type {
  ApiSpec,
  ApiEndpoint,
  ScanResult,
  SchemaDefinition,
} from "./apiSpecScanner.js";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FlowStep {
  order: number;
  endpoint: ApiEndpoint;
  center: string;
  description: string;
  inputFields: FieldMapping[];
  outputFields: FieldMapping[];
  dependsOn: string[]; // operationIds this step depends on
  provides: string[]; // field names this step provides to downstream steps
  preconditions: string[];
  postconditions: string[];
}

export interface FieldMapping {
  fieldName: string;
  type: string;
  required: boolean;
  source: "user_input" | "previous_step" | "enum" | "system_generated";
  sourceStep?: string; // operationId of the step that provides this field
  enumValues?: string[];
  description: string;
}

export interface BusinessFlow {
  name: string;
  description: string;
  category: string; // e.g., "Policy Lifecycle", "Billing", "Claims"
  steps: FlowStep[];
  crossCenterDependencies: CrossCenterDependency[];
  stateTransitions: StateTransition[];
  totalEndpoints: number;
  estimatedComplexity: "low" | "medium" | "high" | "critical";
}

export interface CrossCenterDependency {
  fromCenter: string;
  fromEndpoint: string;
  toCenter: string;
  toEndpoint: string;
  sharedField: string;
  description: string;
}

export interface StateTransition {
  fromState: string;
  toState: string;
  trigger: string; // endpoint that causes the transition
  conditions: string[];
}

export interface FlowGraph {
  flows: BusinessFlow[];
  allStates: string[];
  allEntities: string[];
  crossCenterMap: CrossCenterDependency[];
  metadata: {
    generatedAt: string;
    sourceSpecs: string[];
    totalFlows: number;
    totalSteps: number;
  };
}

// ============================================================================
// Domain Knowledge - Guidewire-Specific Patterns
// ============================================================================

/**
 * Known business flow patterns for Guidewire InsuranceSuite.
 * This is the "domain knowledge layer" that augments API scanning.
 * Extensible for other platforms (Duck Creek, Majesco, etc.)
 */
interface DomainFlowPattern {
  name: string;
  description: string;
  category: string;
  endpointPatterns: EndpointPattern[];
  stateTransitions: StateTransition[];
  crossCenterEffects: string[];
}

interface EndpointPattern {
  order: number;
  pathPattern: string; // regex or glob
  method: string;
  description: string;
  outputProvides: string[];
  requiresFrom?: string; // which previous step's output
}

const GUIDEWIRE_FLOW_PATTERNS: DomainFlowPattern[] = [
  {
    name: "New Business Submission",
    description: "Create a new policy from submission through issuance",
    category: "Policy Lifecycle",
    endpointPatterns: [
      {
        order: 1,
        pathPattern: "POST /accounts",
        method: "POST",
        description: "Create or locate the account",
        outputProvides: ["accountId"],
      },
      {
        order: 2,
        pathPattern: "POST /submissions",
        method: "POST",
        description: "Create a new draft submission",
        outputProvides: ["jobId", "submissionId"],
        requiresFrom: "accountId",
      },
      {
        order: 3,
        pathPattern: ".*\\/jobs\\/{jobId}\\/lines",
        method: "POST",
        description: "Add line of business to submission",
        outputProvides: ["lineId"],
        requiresFrom: "jobId",
      },
      {
        order: 4,
        pathPattern: ".*\\/jobs\\/{jobId}\\/.*coverages",
        method: "POST",
        description: "Add coverages to the submission",
        outputProvides: ["coverageId"],
        requiresFrom: "jobId",
      },
      {
        order: 5,
        pathPattern: ".*\\/jobs\\/{jobId}\\/quote",
        method: "POST",
        description: "Quote the submission",
        outputProvides: ["quotedAmount", "premiumAmount"],
        requiresFrom: "jobId",
      },
      {
        order: 6,
        pathPattern: ".*\\/jobs\\/{jobId}\\/bind-only",
        method: "POST",
        description: "Bind the submission without issuing",
        outputProvides: ["policyId", "policyNumber"],
        requiresFrom: "jobId",
      },
      {
        order: 7,
        pathPattern: ".*\\/jobs\\/{jobId}\\/bind-and-issue",
        method: "POST",
        description: "Bind and issue the policy in one step",
        outputProvides: ["policyId", "policyNumber"],
        requiresFrom: "jobId",
      },
    ],
    stateTransitions: [
      { fromState: "Draft", toState: "Quoted", trigger: "POST /jobs/{jobId}/quote", conditions: ["All required coverages added"] },
      { fromState: "Quoted", toState: "Bound", trigger: "POST /jobs/{jobId}/bind-only", conditions: ["UW issues resolved or approved"] },
      { fromState: "Bound", toState: "Issued", trigger: "POST /policies/{policyId}/issue", conditions: ["Binding complete"] },
      { fromState: "Quoted", toState: "Issued", trigger: "POST /jobs/{jobId}/bind-and-issue", conditions: ["UW issues resolved or approved"] },
    ],
    crossCenterEffects: [
      "BillingCenter: Account and invoice created upon policy issuance",
      "ContactManager: Contact records synchronized",
    ],
  },
  {
    name: "Policy Cancellation",
    description: "Cancel an active policy",
    category: "Policy Lifecycle",
    endpointPatterns: [
      {
        order: 1,
        pathPattern: "GET /policies\\/{policyId}",
        method: "GET",
        description: "Retrieve the policy to verify it is active",
        outputProvides: ["policyId", "policyNumber", "status"],
      },
      {
        order: 2,
        pathPattern: "POST /policies\\/{policyId}\\/cancel",
        method: "POST",
        description: "Initiate cancellation on the policy",
        outputProvides: ["jobId", "cancellationJobId"],
        requiresFrom: "policyId",
      },
      {
        order: 3,
        pathPattern: ".*\\/jobs\\/{jobId}\\/bind-and-issue",
        method: "POST",
        description: "Bind and issue the cancellation",
        outputProvides: ["cancellationEffectiveDate"],
        requiresFrom: "jobId",
      },
    ],
    stateTransitions: [
      { fromState: "InForce", toState: "PendingCancellation", trigger: "POST /policies/{policyId}/cancel", conditions: ["Policy is InForce"] },
      { fromState: "PendingCancellation", toState: "Cancelled", trigger: "POST /jobs/{jobId}/bind-and-issue", conditions: ["Cancellation job bound"] },
    ],
    crossCenterEffects: [
      "BillingCenter: Refund calculated for unearned premium",
      "BillingCenter: Billing account updated with cancellation",
    ],
  },
  {
    name: "Policy Change (Endorsement)",
    description: "Make mid-term changes to an active policy",
    category: "Policy Lifecycle",
    endpointPatterns: [
      {
        order: 1,
        pathPattern: "GET /policies\\/{policyId}",
        method: "GET",
        description: "Retrieve the current policy",
        outputProvides: ["policyId", "policyNumber"],
      },
      {
        order: 2,
        pathPattern: "POST /policies\\/{policyId}\\/change",
        method: "POST",
        description: "Create a policy change job",
        outputProvides: ["jobId", "changeJobId"],
        requiresFrom: "policyId",
      },
      {
        order: 3,
        pathPattern: ".*\\/jobs\\/{jobId}\\/.*coverages",
        method: "PATCH",
        description: "Modify coverages on the policy change",
        outputProvides: [],
        requiresFrom: "jobId",
      },
      {
        order: 4,
        pathPattern: ".*\\/jobs\\/{jobId}\\/quote",
        method: "POST",
        description: "Quote the policy change",
        outputProvides: ["premiumDelta"],
        requiresFrom: "jobId",
      },
      {
        order: 5,
        pathPattern: ".*\\/jobs\\/{jobId}\\/bind-and-issue",
        method: "POST",
        description: "Bind and issue the policy change",
        outputProvides: [],
        requiresFrom: "jobId",
      },
    ],
    stateTransitions: [
      { fromState: "InForce", toState: "InForce (Changed)", trigger: "POST /jobs/{jobId}/bind-and-issue", conditions: ["Change quoted and bound"] },
    ],
    crossCenterEffects: [
      "BillingCenter: Premium adjustment applied",
    ],
  },
  {
    name: "Policy Renewal",
    description: "Renew an existing policy",
    category: "Policy Lifecycle",
    endpointPatterns: [
      {
        order: 1,
        pathPattern: "GET /policies\\/{policyId}",
        method: "GET",
        description: "Retrieve the policy approaching expiration",
        outputProvides: ["policyId", "policyNumber", "expirationDate"],
      },
      {
        order: 2,
        pathPattern: "POST /policies\\/{policyId}\\/renew",
        method: "POST",
        description: "Create a renewal job",
        outputProvides: ["jobId", "renewalJobId"],
        requiresFrom: "policyId",
      },
      {
        order: 3,
        pathPattern: ".*\\/jobs\\/{jobId}\\/quote",
        method: "POST",
        description: "Quote the renewal",
        outputProvides: ["renewalPremium"],
        requiresFrom: "jobId",
      },
      {
        order: 4,
        pathPattern: ".*\\/jobs\\/{jobId}\\/bind-and-issue",
        method: "POST",
        description: "Bind and issue the renewal",
        outputProvides: ["newPolicyNumber", "renewedPolicyId"],
        requiresFrom: "jobId",
      },
    ],
    stateTransitions: [
      { fromState: "InForce", toState: "RenewalInProgress", trigger: "POST /policies/{policyId}/renew", conditions: ["Policy approaching expiration"] },
      { fromState: "RenewalInProgress", toState: "Renewed", trigger: "POST /jobs/{jobId}/bind-and-issue", conditions: ["Renewal quoted and approved"] },
    ],
    crossCenterEffects: [
      "BillingCenter: New billing period created",
      "BillingCenter: Renewal premium invoiced",
    ],
  },
  {
    name: "Underwriting Issue Management",
    description: "Handle underwriting issues on a job",
    category: "Underwriting",
    endpointPatterns: [
      {
        order: 1,
        pathPattern: "GET /jobs\\/{jobId}\\/uw-issues",
        method: "GET",
        description: "Retrieve underwriting issues for a job",
        outputProvides: ["uwIssueId", "uwIssueList"],
        requiresFrom: "jobId",
      },
      {
        order: 2,
        pathPattern: ".*\\/uw-issues\\/{uwIssueId}\\/approve",
        method: "POST",
        description: "Approve an underwriting issue",
        outputProvides: [],
        requiresFrom: "uwIssueId",
      },
      {
        order: 3,
        pathPattern: ".*\\/uw-issues\\/{uwIssueId}\\/reject",
        method: "POST",
        description: "Reject an underwriting issue",
        outputProvides: [],
        requiresFrom: "uwIssueId",
      },
      {
        order: 4,
        pathPattern: ".*\\/uw-issues\\/{uwIssueId}\\/special-approve",
        method: "POST",
        description: "Special-approve an underwriting issue",
        outputProvides: [],
        requiresFrom: "uwIssueId",
      },
    ],
    stateTransitions: [
      { fromState: "Open", toState: "Approved", trigger: "approve", conditions: ["User has authority"] },
      { fromState: "Open", toState: "Rejected", trigger: "reject", conditions: [] },
      { fromState: "Open", toState: "SpecialApproved", trigger: "special-approve", conditions: ["Special authority granted"] },
      { fromState: "Approved", toState: "Reopened", trigger: "reopen", conditions: [] },
    ],
    crossCenterEffects: [],
  },
  {
    name: "Billing Payment Processing",
    description: "Process payments on a billing account",
    category: "Billing",
    endpointPatterns: [
      {
        order: 1,
        pathPattern: "GET /accounts",
        method: "GET",
        description: "Search for billing account",
        outputProvides: ["billingAccountId"],
      },
      {
        order: 2,
        pathPattern: "GET /accounts\\/{accountId}\\/invoices",
        method: "GET",
        description: "Retrieve invoices for the account",
        outputProvides: ["invoiceId", "amountDue"],
        requiresFrom: "billingAccountId",
      },
      {
        order: 3,
        pathPattern: "POST /accounts\\/{accountId}\\/payments",
        method: "POST",
        description: "Create a payment on the account",
        outputProvides: ["paymentId", "paymentConfirmation"],
        requiresFrom: "billingAccountId",
      },
    ],
    stateTransitions: [
      { fromState: "Due", toState: "Paid", trigger: "POST /accounts/{accountId}/payments", conditions: ["Payment amount covers invoice"] },
      { fromState: "Due", toState: "PartiallyPaid", trigger: "POST /accounts/{accountId}/payments", conditions: ["Partial payment"] },
      { fromState: "PastDue", toState: "Paid", trigger: "POST /accounts/{accountId}/payments", conditions: ["Full payment including late fees"] },
    ],
    crossCenterEffects: [],
  },
];

// ============================================================================
// Flow Builder Engine
// ============================================================================

export class ApiFlowBuilder {
  private scanResult: ScanResult;
  private domainPatterns: DomainFlowPattern[];
  private customPatterns: DomainFlowPattern[] = [];

  constructor(scanResult: ScanResult, platform: "guidewire" | "custom" = "guidewire") {
    this.scanResult = scanResult;

    switch (platform) {
      case "guidewire":
        this.domainPatterns = GUIDEWIRE_FLOW_PATTERNS;
        break;
      default:
        this.domainPatterns = [];
    }
  }

  /**
   * Add custom domain patterns (for customer-specific configurations)
   */
  addCustomPattern(pattern: DomainFlowPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * Load custom patterns from a JSON file
   */
  loadCustomPatterns(filePath: string): void {
    const content = require("fs").readFileSync(filePath, "utf-8");
    const patterns = JSON.parse(content);
    this.customPatterns.push(...patterns);
    console.log(`📚 Loaded ${patterns.length} custom domain patterns from ${filePath}`);
  }

  /**
   * Build the complete flow graph by matching API endpoints to domain patterns
   */
  buildFlowGraph(): FlowGraph {
    console.log("\n🔨 Building API Flow Graph...\n");

    const allPatterns = [...this.domainPatterns, ...this.customPatterns];
    const flows: BusinessFlow[] = [];

    for (const pattern of allPatterns) {
      const flow = this.matchPatternToEndpoints(pattern);
      if (flow) {
        flows.push(flow);
        console.log(`  ✅ ${flow.name}: ${flow.steps.length} steps matched (${flow.estimatedComplexity} complexity)`);
      } else {
        console.log(`  ⚠️  ${pattern.name}: Could not match all required endpoints`);
      }
    }

    // Discover additional flows from unmatched endpoints
    const unmatchedFlows = this.discoverUnmatchedFlows(flows);
    flows.push(...unmatchedFlows);

    // Build cross-center dependency map
    const crossCenterMap = this.buildCrossCenterMap(flows);

    const graph: FlowGraph = {
      flows,
      allStates: this.collectAllStates(flows),
      allEntities: this.collectAllEntities(),
      crossCenterMap,
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceSpecs: this.scanResult.centers,
        totalFlows: flows.length,
        totalSteps: flows.reduce((sum, f) => sum + f.steps.length, 0),
      },
    };

    console.log(`\n📊 Flow Graph Summary:`);
    console.log(`   Flows: ${graph.flows.length}`);
    console.log(`   Total Steps: ${graph.metadata.totalSteps}`);
    console.log(`   States: ${graph.allStates.length}`);
    console.log(`   Cross-Center Dependencies: ${graph.crossCenterMap.length}`);

    return graph;
  }

  /**
   * Match a domain pattern against actual API endpoints
   */
  private matchPatternToEndpoints(pattern: DomainFlowPattern): BusinessFlow | null {
    const steps: FlowStep[] = [];
    let matchedCount = 0;

    for (const ep of pattern.endpointPatterns) {
      const matched = this.findMatchingEndpoint(ep.pathPattern, ep.method);

      if (matched) {
        matchedCount++;
        const center = this.findEndpointCenter(matched);

        const step: FlowStep = {
          order: ep.order,
          endpoint: matched,
          center,
          description: ep.description,
          inputFields: this.buildInputFieldMappings(matched, steps),
          outputFields: this.buildOutputFieldMappings(matched, ep.outputProvides),
          dependsOn: ep.requiresFrom
            ? steps.filter((s) => s.provides.includes(ep.requiresFrom!)).map((s) => s.endpoint.operationId)
            : [],
          provides: ep.outputProvides,
          preconditions: this.inferPreconditions(matched, pattern),
          postconditions: this.inferPostconditions(matched, pattern),
        };

        steps.push(step);
      }
    }

    // Require at least 50% of pattern endpoints to match
    if (matchedCount < pattern.endpointPatterns.length * 0.5) {
      return null;
    }

    return {
      name: pattern.name,
      description: pattern.description,
      category: pattern.category,
      steps,
      crossCenterDependencies: this.buildFlowCrossCenterDeps(steps, pattern),
      stateTransitions: pattern.stateTransitions,
      totalEndpoints: steps.length,
      estimatedComplexity: this.estimateComplexity(steps, pattern),
    };
  }

  /**
   * Find an API endpoint matching a pattern
   */
  private findMatchingEndpoint(pathPattern: string, method: string): ApiEndpoint | null {
    // Try exact match first (e.g., "POST /submissions")
    const [patMethod, patPath] = pathPattern.includes(" ")
      ? pathPattern.split(" ", 2)
      : [method, pathPattern];

    for (const spec of this.scanResult.specs) {
      for (const endpoint of spec.endpoints) {
        // Exact path match
        if (endpoint.method === patMethod && endpoint.path === patPath) {
          return endpoint;
        }

        // Regex match
        try {
          const regex = new RegExp(patPath);
          if (endpoint.method === patMethod && regex.test(endpoint.path)) {
            return endpoint;
          }
        } catch {
          // Not a valid regex, skip
        }
      }
    }

    return null;
  }

  /**
   * Find which center an endpoint belongs to
   */
  private findEndpointCenter(endpoint: ApiEndpoint): string {
    for (const spec of this.scanResult.specs) {
      if (spec.endpoints.includes(endpoint)) {
        return spec.title;
      }
    }
    return "Unknown";
  }

  /**
   * Build input field mappings - determine where each input comes from
   */
  private buildInputFieldMappings(endpoint: ApiEndpoint, previousSteps: FlowStep[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    // Path parameters - these come from previous steps
    for (const param of endpoint.parameters.filter((p) => p.in === "path")) {
      const sourceStep = previousSteps.find((s) => s.provides.includes(param.name));

      mappings.push({
        fieldName: param.name,
        type: param.type,
        required: true,
        source: sourceStep ? "previous_step" : "user_input",
        sourceStep: sourceStep?.endpoint.operationId,
        enumValues: param.enum,
        description: param.description,
      });
    }

    // Request body fields
    if (endpoint.requestBody) {
      for (const fieldName of endpoint.requiredFields) {
        const prop = endpoint.requestBody.schema.properties[fieldName];
        const sourceStep = previousSteps.find((s) => s.provides.includes(fieldName));

        mappings.push({
          fieldName,
          type: prop?.type || "string",
          required: true,
          source: sourceStep ? "previous_step" : prop?.enum ? "enum" : "user_input",
          sourceStep: sourceStep?.endpoint.operationId,
          enumValues: prop?.enum,
          description: prop?.description || "",
        });
      }
    }

    return mappings;
  }

  /**
   * Build output field mappings from response schema
   */
  private buildOutputFieldMappings(endpoint: ApiEndpoint, knownOutputs: string[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    const successResponse = endpoint.responses["200"] || endpoint.responses["201"];

    if (successResponse?.schema) {
      for (const fieldName of knownOutputs) {
        const prop = successResponse.schema.properties[fieldName];
        mappings.push({
          fieldName,
          type: prop?.type || "string",
          required: true,
          source: "system_generated",
          description: prop?.description || `Output field: ${fieldName}`,
        });
      }
    }

    return mappings;
  }

  /**
   * Infer preconditions for a step based on domain knowledge
   */
  private inferPreconditions(endpoint: ApiEndpoint, pattern: DomainFlowPattern): string[] {
    const conditions: string[] = [];

    // If the endpoint requires path params, the parent resource must exist
    for (const dep of endpoint.pathDependencies) {
      conditions.push(`${dep} must exist and be accessible`);
    }

    // Check state transitions for required states
    for (const transition of pattern.stateTransitions) {
      if (endpoint.path.includes(transition.trigger.split(" ").pop() || "")) {
        conditions.push(`Entity must be in "${transition.fromState}" state`);
        conditions.push(...transition.conditions);
      }
    }

    return conditions;
  }

  /**
   * Infer postconditions for a step
   */
  private inferPostconditions(endpoint: ApiEndpoint, pattern: DomainFlowPattern): string[] {
    const conditions: string[] = [];

    for (const transition of pattern.stateTransitions) {
      if (endpoint.path.includes(transition.trigger.split(" ").pop() || "")) {
        conditions.push(`Entity transitions to "${transition.toState}" state`);
      }
    }

    return conditions;
  }

  /**
   * Discover flows from endpoints not covered by domain patterns
   */
  private discoverUnmatchedFlows(existingFlows: BusinessFlow[]): BusinessFlow[] {
    const matchedOperationIds = new Set(
      existingFlows.flatMap((f) => f.steps.map((s) => s.endpoint.operationId)),
    );

    const unmatchedByTag: Map<string, ApiEndpoint[]> = new Map();

    for (const spec of this.scanResult.specs) {
      for (const endpoint of spec.endpoints) {
        if (matchedOperationIds.has(endpoint.operationId)) continue;

        const tag = endpoint.tags[0] || "Uncategorized";
        if (!unmatchedByTag.has(tag)) {
          unmatchedByTag.set(tag, []);
        }
        unmatchedByTag.get(tag)!.push(endpoint);
      }
    }

    const discoveredFlows: BusinessFlow[] = [];

    for (const [tag, endpoints] of unmatchedByTag) {
      if (endpoints.length < 2) continue;

      // Group CRUD operations as a flow
      const hasCreate = endpoints.some((e) => e.method === "POST");
      const hasRead = endpoints.some((e) => e.method === "GET");

      if (hasCreate || hasRead) {
        const flow: BusinessFlow = {
          name: `Manage ${tag}`,
          description: `CRUD operations for ${tag} (auto-discovered)`,
          category: "Auto-Discovered",
          steps: endpoints.map((e, i) => ({
            order: i + 1,
            endpoint: e,
            center: this.findEndpointCenter(e),
            description: e.summary || e.description,
            inputFields: [],
            outputFields: [],
            dependsOn: [],
            provides: [],
            preconditions: [],
            postconditions: [],
          })),
          crossCenterDependencies: [],
          stateTransitions: [],
          totalEndpoints: endpoints.length,
          estimatedComplexity: "low",
        };

        discoveredFlows.push(flow);
      }
    }

    if (discoveredFlows.length > 0) {
      console.log(`\n  🔍 Auto-discovered ${discoveredFlows.length} additional flows from unmatched endpoints`);
    }

    return discoveredFlows;
  }

  /**
   * Build cross-center dependency map
   */
  private buildCrossCenterMap(flows: BusinessFlow[]): CrossCenterDependency[] {
    const deps: CrossCenterDependency[] = [];

    for (const flow of flows) {
      deps.push(...flow.crossCenterDependencies);
    }

    return deps;
  }

  private buildFlowCrossCenterDeps(steps: FlowStep[], pattern: DomainFlowPattern): CrossCenterDependency[] {
    const deps: CrossCenterDependency[] = [];

    // Check if steps span multiple centers
    const centers = [...new Set(steps.map((s) => s.center))];

    if (centers.length > 1) {
      for (let i = 1; i < steps.length; i++) {
        if (steps[i].center !== steps[i - 1].center) {
          const sharedFields = steps[i].dependsOn;
          deps.push({
            fromCenter: steps[i - 1].center,
            fromEndpoint: steps[i - 1].endpoint.operationId,
            toCenter: steps[i].center,
            toEndpoint: steps[i].endpoint.operationId,
            sharedField: sharedFields.join(", ") || "implicit",
            description: `${steps[i - 1].center} → ${steps[i].center} data flow`,
          });
        }
      }
    }

    return deps;
  }

  /**
   * Estimate flow complexity
   */
  private estimateComplexity(steps: FlowStep[], pattern: DomainFlowPattern): BusinessFlow["estimatedComplexity"] {
    const factors = {
      stepCount: steps.length,
      crossCenter: pattern.crossCenterEffects.length > 0,
      stateTransitions: pattern.stateTransitions.length,
      hasConditionalBranching: pattern.stateTransitions.some(
        (t) => t.conditions.length > 0,
      ),
    };

    const score =
      factors.stepCount * 2 +
      (factors.crossCenter ? 5 : 0) +
      factors.stateTransitions * 2 +
      (factors.hasConditionalBranching ? 3 : 0);

    if (score >= 20) return "critical";
    if (score >= 12) return "high";
    if (score >= 6) return "medium";
    return "low";
  }

  private collectAllStates(flows: BusinessFlow[]): string[] {
    const states = new Set<string>();
    for (const flow of flows) {
      for (const transition of flow.stateTransitions) {
        states.add(transition.fromState);
        states.add(transition.toState);
      }
    }
    return [...states];
  }

  private collectAllEntities(): string[] {
    const entities = new Set<string>();
    for (const spec of this.scanResult.specs) {
      for (const schemaName of Object.keys(spec.schemas)) {
        entities.add(schemaName);
      }
    }
    return [...entities];
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get the flow for a specific feature name
   */
  getFlowByName(name: string, graph: FlowGraph): BusinessFlow | undefined {
    return graph.flows.find(
      (f) => f.name.toLowerCase().includes(name.toLowerCase()),
    );
  }

  /**
   * Get all flows for a specific category
   */
  getFlowsByCategory(category: string, graph: FlowGraph): BusinessFlow[] {
    return graph.flows.filter(
      (f) => f.category.toLowerCase().includes(category.toLowerCase()),
    );
  }

  /**
   * Get the complete call chain for a feature
   * Returns the ordered sequence of API calls needed
   */
  getCallChain(flowName: string, graph: FlowGraph): string[] {
    const flow = this.getFlowByName(flowName, graph);
    if (!flow) return [];

    return flow.steps
      .sort((a, b) => a.order - b.order)
      .map((s) => `${s.endpoint.method} ${s.endpoint.path} (${s.center})`);
  }

  /**
   * Export the flow graph to JSON
   */
  exportFlowGraph(graph: FlowGraph, outputPath: string): void {
    const fs = require("fs");
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2), "utf-8");
    console.log(`💾 Flow graph exported to: ${outputPath}`);
  }
}
