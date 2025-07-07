/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

declare module 'prettier' {
    export function format(source: string, options?: any): string;
    export function resolveConfig(filePath: string): Promise<any>;
    export function getFileInfo(filePath: string, options?: any): Promise<any>;
    // You can add more functions or types as needed
}