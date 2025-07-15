// support/resolveMockAPI.ts
import { MockAccessAPI } from '../mocks/mock-access-api';

export function resolveMockAPI(tags: string[]): any {
  if (tags.includes('@hipaa') || tags.includes('@physical')) {
    return new MockAccessAPI();
  }

  // Add more as needed:
  // if (tags.includes('@rag')) return new MockRAGAPI();

  return undefined;
}