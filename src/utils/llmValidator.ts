import fs from 'fs';
import path from 'path';

export function validateStructure(obj: any, requiredFields: string[]): void {
  requiredFields.forEach((field) => {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  });
}

const ACCEPTABLE_FALLBACKS = [
  'i\'m not sure',
  'no relevant',
  'couldn\'t find',
  'please try again',
  'try a different question',
  'no useful information',
  'nothing relevant',
  'no results',
  'i don’t know',
  'sorry'
];

export function checkForHallucinations(text: string, allowedEntities: string[]): void {
  const normalizedText = text?.trim().toLowerCase() ?? '';

  if (!text) {
    throw new Error('No AI response provided for hallucination check.');
  }

  // CASE 1: No entities expected (e.g., no results), but response must be empty or contain fallback
  if (allowedEntities.length === 0) {
    const fallbackMatched = ACCEPTABLE_FALLBACKS.some(fallback =>
      normalizedText.includes(fallback)
    );
    if (normalizedText && !fallbackMatched) {
      throw new Error(
        'Hallucination detected: Output should be empty or contain an acceptable fallback (e.g., "I’m not sure").'
      );
    }
    return;
  }

  // CASE 2: Entities expected — at least one must be present
  const foundEntity = allowedEntities.some(entity =>
    normalizedText.includes(entity.toLowerCase())
  );
  if (!foundEntity) {
    throw new Error(
      `Hallucination detected: None of the known entities [${allowedEntities.join(', ')}] were found in output.`
    );
  }
}

export function assertDateFormat(dateStr: string): void {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateStr)) {
    throw new Error(`Date format invalid: ${dateStr}`);
  }
}

export function compareWithSnapshot(actual: string, snapshotFilePath: string): void {
  const snapshot = fs.readFileSync(path.resolve(snapshotFilePath), 'utf-8').trim();
  if (actual.trim() !== snapshot) {
    throw new Error('Snapshot mismatch: Output has drifted.');
  }
}

export function validateTopKDocuments(docs: any[], expectedCount: number): void {
  if (!docs || docs.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} documents, but got ${docs?.length ?? 0}`);
  }
}

export function checkDocsContainKeywords(docs: any[], keywords: string[]): void {
  for (const keyword of keywords) {
    const found = docs.some(doc =>
      (doc.body?.toLowerCase().includes(keyword.toLowerCase()) ||
       doc.title?.toLowerCase().includes(keyword.toLowerCase()))
    );
    if (!found) {
      throw new Error(`No document contains the keyword: ${keyword}`);
    }
  }
}

export function assertSummaryMentions(summary: string, expectedPhrases: string[]): void {
  if (!summary || typeof summary !== 'string') {
    throw new Error('No summary provided to assertSummaryMentions.');
  }

  const normalizedSummary = summary.toLowerCase().trim();
  const match = expectedPhrases.find(phrase =>
    normalizedSummary.includes(phrase.toLowerCase())
  );

  if (!match) {
    throw new Error(
      'Summary does not contain any of the expected phrases.\n' +
      `Expected one of: ${expectedPhrases.join(', ')}\n` +
      `Actual summary: "${summary}"`
    );
  }
}

export function assertFallbackMessage(summary: string, fallbackHints: string[]): void {
  const normalized = summary.toLowerCase();
  for (const hint of fallbackHints) {
    if (normalized.includes(hint.toLowerCase())) return;
  }
  throw new Error('Missing fallback message for unanswerable query.');
}

export function validateReferences(references: string[], expectedIds: string[]): void {
  for (const ref of references) {
    if (!expectedIds.includes(ref)) {
      throw new Error(`Reference ${ref} is not in retrieved document set.`);
    }
  }
}