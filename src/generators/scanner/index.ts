/**
 * FeatureForgeAI - API Flow Engine
 * Module exports
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

export { ApiSpecScanner } from "./apiSpecScanner.js";
export type {
  ApiEndpoint,
  ApiParameter,
  ApiRequestBody,
  ApiResponse,
  ApiSpec,
  ApiTag,
  ScanResult,
  SchemaDefinition,
  SchemaProperty,
} from "./apiSpecScanner.js";

export { ApiFlowBuilder } from "./apiFlowBuilder.js";
export type {
  BusinessFlow,
  CrossCenterDependency,
  FieldMapping,
  FlowGraph,
  FlowStep,
  StateTransition,
} from "./apiFlowBuilder.js";

export { FlowAwareFeatureGenerator } from "./flowAwareFeatureGenerator.js";
export type {
  GeneratedFeature,
  FeatureMetadata,
  GenerationConfig,
} from "./flowAwareFeatureGenerator.js";

export { ApiFlowEngine } from "./cli.js";

export { HybridGenerator, OpenAIClient, OllamaClient, buildFlowContext } from "./hybridGenerator.js";
export type { HybridGenerationRequest, HybridGenerationResult, LLMClient } from "./hybridGenerator.js";
