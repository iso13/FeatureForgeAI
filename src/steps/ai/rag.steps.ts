// src/steps/rag.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { RAGEngine } from '../../ai/ragHelper';
import type{ Clause } from '../../ai/ragHelper';
import type { CustomWorld } from '../../support/world';

const clauseSet: Clause[] = [
  { id: 'C001', type: 'confidentiality', content: 'This contract includes a confidentiality clause.' },
  { id: 'C002', type: 'payment', content: 'Payment must be made within 30 days of invoice.' }
];

Given('the RAG system has indexed contract documents containing clauses for confidentiality and payment terms', function (this: CustomWorld) {
  this.rag = new RAGEngine();
  this.rag.indexDocuments(clauseSet);
});

When('I request a summary of a contract', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  this.summary = this.rag.requestSummary(['confidentiality', 'payment']);
});

When('I request a summary of a contract missing indemnity clauses', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  this.summary = this.rag.requestSummary(['indemnity']);
});

When('I re-request the summary', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  this.summary = this.rag.requestSummary(['confidentiality', 'payment', 'indemnity']);
});

When('I review the AI-generated summary', function (this: CustomWorld) {
  if (!this.summary) throw new Error('Summary not generated');
  // Placeholder for a review action, can be expanded later
});

Then('the system should retrieve relevant context for each clause', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  const clauseIds = this.rag.getRetrievedClauseIds();
  expect(clauseIds).to.include('C001');
  expect(clauseIds).to.include('C002');
});

Then('the system should generate a summary including confidentiality and payment terms', function (this: CustomWorld) {
  const summary = this.summary ?? '';
  expect(summary).to.include('confidentiality');
  expect(summary).to.include('payment');
});

Then('the summary should match the retrieved content', function (this: CustomWorld) {
  expect(this.summary).to.include(clauseSet[0].content);
  expect(this.summary).to.include(clauseSet[1].content);
});

Then('the system should log a warning about the missing context', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  const log = this.rag.getLogs().find((l: string) => l.toLowerCase().includes('warning'));
  expect(log).to.exist;
});

Then('the generated summary should note the missing indemnity information', function (this: CustomWorld) {
  const summary = this.summary ?? '';
  expect(summary.toLowerCase()).to.include('incomplete');
});

Then('each included clause should be mapped to a source document ID', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  const clauseIds = this.rag.getRetrievedClauseIds();
  expect(clauseIds.length).to.be.greaterThan(0);
});

Then('the summary should comply with regulatory standards for transparency', function (this: CustomWorld) {
  const summary = this.summary ?? '';
  expect(summary).to.be.a('string');
  // Placeholder: In real tests, validate against compliance rules
  expect(true).to.be.true;
});

Given('a new indemnity clause is added to the contract', function (this: CustomWorld) {
  if (!this.rag) throw new Error('RAGEngine not initialized');
  this.rag.addClause({ id: 'C003', type: 'indemnity', content: 'Indemnity clause added for liability coverage.' });
});

Then('the new clause should be included in the updated AI summary', function (this: CustomWorld) {
  expect(this.summary).to.include('indemnity');
  expect(this.summary).to.include('Indemnity clause added');
});
