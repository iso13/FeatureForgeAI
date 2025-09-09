/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// src/support/environments.ts
export const environments: Record<"qa" | "dev" | "staging", string> = {
  qa: "https://qa.test.com/",
  dev: "https://dev.test.com/",
  staging: "https://staging.test.com/",
};

export const getBaseURL = (): string => {
  const envKey = (process.env.ENV as keyof typeof environments) ?? "qa"; // Fallback to 'qa' if undefined
  const baseURL = environments[envKey];
  if (!baseURL) throw new Error("Invalid environment value");
  return baseURL;
};
