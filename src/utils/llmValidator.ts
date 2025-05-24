// utils/llmValidator.ts
import fs from 'fs';
import path from 'path';

export function validateStructure(obj: any, requiredFields: string[]): void {
  requiredFields.forEach((field) => {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  });
}

export function checkForHallucinations(text: string, allowedEntities: string[]): void {
  if (allowedEntities.length === 0 && text.trim()) {
    throw new Error('Potential hallucination detected: Output should be empty or safely fallback.');
  }
  for (const word of allowedEntities) {
    if (text.includes(word)) return;
  }
  if (allowedEntities.length > 0) {
    throw new Error('Hallucination detected: Output does not match known entities.');
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
    throw new Error(`Expected ${expectedCount} documents, but got ${docs.length}`);
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
  for (const phrase of expectedPhrases) {
    if (!summary.toLowerCase().includes(phrase.toLowerCase())) {
      throw new Error(`Summary does not contain expected phrase: ${phrase}`);
    }
  }
}

export function assertFallbackMessage(summary: string, fallbackHints: string[]): void {
  for (const hint of fallbackHints) {
    if (summary.toLowerCase().includes(hint.toLowerCase())) return;
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
