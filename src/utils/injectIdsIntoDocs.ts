/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// src/utils/injectIdsIntoDocs.ts

export interface DocumentInput {
  docId?: string;
  title: string;
  body: string;
  tags?: string[];
  [key: string]: any; // Allows additional optional properties
}

export interface DocumentOutput extends DocumentInput {
  docId: string; // Required after ID injection
}

/**
 * Injects a unique `docId` into each document if it doesn't already exist.
 *
 * @param docs - The input list of documents to process.
 * @param prefix - Optional prefix for generated docIds (default: 'doc').
 * @returns An array of documents with guaranteed `docId` fields.
 */
export function injectIdsIntoDocs(
  docs: DocumentInput[],
  prefix = 'doc'
): DocumentOutput[] {
  return docs.map((doc: DocumentInput, index: number): DocumentOutput => {
    const docId = doc.docId ?? `${prefix}-${index + 1}`; // nullish coalescing

    console.log(`[injectIdsIntoDocs] Injected docId: ${docId}`);
    
    return {
      ...doc,
      docId,
    };
  });
}