// 📄 src/utils/weaviateClient.ts

import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { Span } from '@opentelemetry/api';
import { withSpan } from './traceHelper';

let client: WeaviateClient;

export function getWeaviateClient(): WeaviateClient {
  if (!client) {
    client = weaviate.client({
      scheme: 'http',
      host: 'localhost:8080', // Ensure this matches Docker or Weaviate setup
    });
  }
  return client;
}

export async function createSchemaIfNeeded(parentSpan?: Span): Promise<void> {
  const client = getWeaviateClient();

  await withSpan('createSchemaIfNeeded', async span => {
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
            { name: 'title', dataType: ['text'] },
            { name: 'body', dataType: ['text'] },
            { name: 'tags', dataType: ['text[]'] },
          ],
        })
        .do();
    }
  }, {}, parentSpan);
}

export async function importDocuments(docs: any[], parentSpan?: Span): Promise<void> {
  const client = getWeaviateClient();

  await withSpan('importDocuments', async span => {
    for (const doc of docs) {
      await client.data
        .creator()
        .withClassName('Document')
        .withProperties({
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
      .withFields('title body tags _additional {certainty}')
      .withNearText({ concepts: [query] })
      .withLimit(topK)
      .do();

    span.setAttribute('query', query);
    span.setAttribute('topK', topK);
    span.setAttribute('matchCount', result?.data?.Get?.Document?.length || 0);

    return result;
  }, { query, topK }, parentSpan);
}