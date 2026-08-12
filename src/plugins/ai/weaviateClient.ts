// src/utils/weaviateClient.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

// utils/weaviateClient.ts
// MIGRATED: weaviate-ts-client (v2, deprecated) -> weaviate-client (v3)

import weaviate, { type WeaviateClient } from "weaviate-client";
import type { Span } from "@opentelemetry/api";
import { withSpan } from "../telemetry/traceHelper";
import type { DocumentInput } from "../../core/utils/injectIdsIntoDocs";

process.env.OPENAI_APIKEY ??= process.env.OPENAI_API_KEY;

// v3 connection is async, so we cache a Promise rather than the client itself.
let clientPromise: Promise<WeaviateClient> | undefined;

export function getWeaviateClient(): Promise<WeaviateClient> {
  if (!clientPromise) {
    clientPromise = weaviate.connectToLocal({
      host: "localhost",
      port: 8080,
    });
  }
  return clientPromise;
}

async function waitForWeaviateReady(
  timeoutMs = 15000,
  intervalMs = 500,
): Promise<void> {
  const client = await getWeaviateClient();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const isReady = await client.isReady();
      if (isReady) return;
    } catch {
      // ignore errors and keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Weaviate is not ready after ${timeoutMs / 1000} seconds.`);
}

export async function createSchemaIfNeeded(parentSpan?: Span): Promise<void> {
  const client = await getWeaviateClient();

  await withSpan(
    "createSchemaIfNeeded",
    async (span) => {
      await waitForWeaviateReady(); // ✅ ensure readiness before schema ops

      const schemaExists = await client.collections.exists("Document");
      span.setAttribute("schemaExists", schemaExists ?? false);

      if (!schemaExists) {
        await client.collections.create({
          name: "Document",
          description: "Internal knowledge base documents",
          vectorizers: weaviate.configure.vectors.text2VecOpenAI({
            name: "default",
            model: "ada",
            modelVersion: "002",
          }),
          properties: [
            {
              name: "docId",
              dataType: "text",
              skipVectorization: true,
              indexFilterable: true,
              description: "A unique identifier for this document",
            },
            { name: "title", dataType: "text" },
            { name: "body", dataType: "text" },
            { name: "tags", dataType: "text[]" },
          ],
        });
      }
    },
    {},
    parentSpan,
  );
}

export async function importDocuments(
  docs: DocumentInput[],
  parentSpan?: Span,
): Promise<void> {
  const client = await getWeaviateClient();
  const collection = client.collections.get("Document");

  await withSpan(
    "importDocuments",
    async (span) => {
      for (const doc of docs) {
        await collection.data.insert({
          docId: doc.docId ?? "",
          title: doc.title,
          body: doc.body,
          tags: doc.tags ?? [],
        });
      }

      span.setAttribute("documentCount", docs.length);
    },
    {},
    parentSpan,
  );
}

export async function querySimilarDocs(
  query: string,
  topK = 3,
  parentSpan?: Span,
): Promise<any> {
  const client = await getWeaviateClient();
  const collection = client.collections.get("Document");

  return await withSpan(
    "querySimilarDocs",
    async (span) => {
      const result = await collection.query.nearText([query], {
        limit: topK,
        returnMetadata: ["certainty"],
      });

      span.setAttribute("query", query);
      span.setAttribute("topK", topK);
      span.setAttribute("matchCount", result?.objects?.length || 0);

      return result;
    },
    { query, topK },
    parentSpan,
  );
}
