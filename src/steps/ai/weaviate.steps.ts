import { When, Then, Given } from '@cucumber/cucumber';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CustomWorld } from '../../support/world';
import {
  createSchemaIfNeeded,
  importDocuments,
  querySimilarDocs,
} from '../../utils/weaviateClient';
import { generateSummaryLLM } from '../../utils/llmClient';
import { withSpan } from '../../utils/traceHelper';
import { injectIdsIntoDocs } from '../../utils/injectIdsIntoDocs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

Given('our document system is ready', async function (this: CustomWorld) {
  await createSchemaIfNeeded(this.stepSpan);
});

Given('helpful documents are available to search', { timeout: 15000 }, async function (this: CustomWorld) {
  await withSpan('loadDocuments', async span => {
    const filePath = path.join(__dirname, '../../data/internal_docs.json');
    const rawDocs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const documents = injectIdsIntoDocs(rawDocs, 'doc');
    documents.forEach(doc => {
      console.log(`[injectIdsIntoDocs] Injected docId: ${doc.docId}`);
    });
    await importDocuments(documents, span);
  }, {}, this.stepSpan);
});

When('I search for {string}', async function (this: CustomWorld, query: string) {
  await withSpan('searchDocuments', async span => {
    this.lastQuery = query;
    const result = await querySimilarDocs(query, 3, span);
    this.retrievedDocs = result.data.Get.Document;

    console.log('Retrieved Documents:',
      this.retrievedDocs?.map(d => ({ docId: d.docId, title: d.title })) ?? 'No documents found'
    );

    const docs = this.retrievedDocs?.map(doc => doc.body) ?? [];
    const summary = await generateSummaryLLM(docs, query, span);
    this.summary = summary;
    this.lastSummaryOutput = summary;
    this.aiSummary = summary;
  }, { query }, this.stepSpan);
});

Then('the AI should give me a short summary based on those documents', async function (this: CustomWorld) {
  expect(this.summary).to.be.a('string').and.not.empty;
  expect(this.summary.length).to.be.lessThan(1000);
});

Then('the summary should say something like {string}', async function (this: CustomWorld, expected: string) {
  const normalizedExpected = expected.toLowerCase().split(' ');
  const actual = this.summary.toLowerCase();

  const found = normalizedExpected.some(word => actual.includes(word));

  expect(
    found,
    `Expected summary to contain at least part of "${expected}", but got:\n${this.summary}`
  ).to.be.true;
});

Then('the AI summary should be no longer than {int} sentences', async function (this: CustomWorld, maxSentences: number) {
  const sentenceCount = this.summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  expect(sentenceCount).to.be.at.most(maxSentences);
});

Then('the AI summary should mention a keyword like {string} or {string}', async function (
  this: CustomWorld,
  keyword1: string,
  keyword2: string
) {
  const summary = this.summary.toLowerCase();
  const containsAny = [keyword1, keyword2].some(k =>
    summary.includes(k.toLowerCase()) ||
    summary.includes(k.split(' ')[0].toLowerCase()) // fallback partial match
  );

  expect(
    containsAny,
    `Expected summary to include "${keyword1}" or "${keyword2}", but got:\n${this.summary}`
  ).to.be.true;
});

Then('I should see the top {int} most relevant documents', async function (this: CustomWorld, expectedCount: number) {
  expect(this.retrievedDocs, 'retrievedDocs is undefined').to.not.be.undefined;
  expect(this.retrievedDocs).to.be.an('array').with.lengthOf(expectedCount);
});

Then('those documents should talk about {string}', async function (this: CustomWorld, keyword: string) {
  expect(this.retrievedDocs, 'retrievedDocs is undefined').to.not.be.undefined;

  const keywordLower = keyword.toLowerCase();
  const found = this.retrievedDocs!.every(doc =>
    (doc.title?.toLowerCase().includes(keywordLower) || doc.body?.toLowerCase().includes(keywordLower))
  );

  expect(found, `Not all docs mentioned "${keyword}"`).to.be.true;
});

Then('the AI should not make something up', async function (this: CustomWorld) {
  const fallback = 'I\'m sorry, I couldn’t find relevant information. Can you please rephrase your question?';
  expect(this.summary).to.include(fallback);
});

Then('it should ask me to try a different question', async function (this: CustomWorld) {
  const message = this.summary.toLowerCase();
  expect(message.includes('rephrase') || message.includes('different question'), 'Expected AI to ask for a rephrased question.').to.be.true;
});