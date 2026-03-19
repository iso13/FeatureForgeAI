/**
 * FeatureForgeAI - API Flow Engine
 * Module exports
 *
 * Copyright (c) 2024-2026 David Tran
 * Licensed under the Business Source License 1.1
 */

// SPDX-License-Identifier: BSL-1.1

export { ApiSpecScanner } from "./apiSpecScanner";
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
} from "./apiSpecScanner";

export { ApiFlowBuilder } from "./apiFlowBuilder";
export type {
  BusinessFlow,
  CrossCenterDependency,
  FieldMapping,
  FlowGraph,
  FlowStep,
  StateTransition,
} from "./apiFlowBuilder";

export { FlowAwareFeatureGenerator } from "./flowAwareFeatureGenerator";
export type {
  GeneratedFeature,
  FeatureMetadata,
  GenerationConfig,
} from "./flowAwareFeatureGenerator";

export { ApiFlowEngine } from "./cli";

export { HybridGenerator, OpenAIClient, OllamaClient, buildFlowContext } from "./hybridGenerator.js";
export type { HybridGenerationRequest, HybridGenerationResult, LLMClient } from "./hybridGenerator.js";
