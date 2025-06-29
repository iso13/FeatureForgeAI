// utils/weaviateClient.ts

import weaviate from 'weaviate-ts-client';
import type { WeaviateClient } from 'weaviate-ts-client';
import type { Span } from '@opentelemetry/api';
import { withSpan } from './traceHelper';
import type { DocumentInput } from './injectIdsIntoDocs';

process.env.OPENAI_APIKEY ??= process.env.OPENAI_API_KEY;

let client: WeaviateClient;

export function getWeaviateClient(): WeaviateClient {
  if (!client) {
    client = weaviate.client({
      scheme: 'http',
      host: 'localhost:8080',
    });
  }
  return client;
}

async function waitForWeaviateReady(timeoutMs = 15000, intervalMs = 500): Promise<void> {
  const client = getWeaviateClient();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const status = await client.misc.readyChecker().do();
      if (status.isReady) return;
    } catch {
      // ignore errors and keep polling
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Weaviate is not ready after ${timeoutMs / 1000} seconds.`);
}

export async function createSchemaIfNeeded(parentSpan?: Span): Promise<void> {
  const client = getWeaviateClient();

  await withSpan('createSchemaIfNeeded', async span => {
    await waitForWeaviateReady(); // ✅ ensure readiness before schema ops

    const existingSchema = await client.schema.getter().do();
    const schemaExists = existingSchema.classes?.some(c => c.class === 'Document');
    span.setAttribute('schemaExists', schemaExists ?? false);

    if (!schemaExists) {
      await client.schema
        .classCreator()
        .withClass({
          class: 'Document',
          description: 'Internal knowledge base documents',
          vectorizer: 'text2vec-openai',
          moduleConfig: {
            'text2vec-openai': {
              model: 'ada',
              modelVersion: '002',
              type: 'text',
            },
          },
          properties: [
            {
              name: 'docId',
              dataType: ['text'],
              moduleConfig: { 'text2vec-openai': { skip: true } },
              indexInverted: true,
              description: 'A unique identifier for this document',
            },
            { name: 'title', dataType: ['text'] },
            { name: 'body', dataType: ['text'] },
            { name: 'tags', dataType: ['text[]'] },
          ],
        })
        .do();
    }
  }, {}, parentSpan);
}

export async function importDocuments(docs: DocumentInput[], parentSpan?: Span): Promise<void> {
  const client = getWeaviateClient();

  await withSpan('importDocuments', async span => {
    for (const doc of docs) {
      await client.data
        .creator()
        .withClassName('Document')
        .withProperties({
          docId: doc.docId,
          title: doc.title,
          body: doc.body,
          tags: doc.tags,
        })
        .do();
    }

    span.setAttribute('documentCount', docs.length);
  }, {}, parentSpan);
}

export async function querySimilarDocs(query: string, topK = 3, parentSpan?: Span): Promise<any> {
  const client = getWeaviateClient();

  return await withSpan('querySimilarDocs', async span => {
    const result = await client.graphql
      .get()
      .withClassName('Document')
      .withFields('docId title body tags _additional {certainty}')
      .withNearText({ concepts: [query] })
      .withLimit(topK)
      .do();

    span.setAttribute('query', query);
    span.setAttribute('topK', topK);
    span.setAttribute('matchCount', result?.data?.Get?.Document?.length || 0);

    return result;
  }, { query, topK }, parentSpan);
}