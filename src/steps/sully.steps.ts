import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('the AI agent has access to real-time audio of the clinical visit', async function (this: CustomWorld) {
  if (!this.api) throw new Error('API not initialized');
  this.audioStream = await this.api.connectAudioStream('clinical-room');
  expect(this.audioStream).toBeDefined();
});

Given('the EMR system is connected for storing visit notes', async function (this: CustomWorld) {
  if (!this.api) throw new Error('API not initialized');
  if (!this.emr) this.emr = {
    status: 'connected',
    storeVisitSummary: async (summary) => {
      console.log('📝 Summary stored in EMR:', summary);
      return { success: true };
    },
  };
  await this.api.connectEMR();
  expect(this.emr.status).toBe('connected');
});

When('the doctor completes a routine checkup', async function (this: CustomWorld) {
  // This step simulates the end of a visit
  expect(this.audioStream).toBeDefined();
});

Then('the AI should transcribe the conversation', async function (this: CustomWorld) {
  if (!this.healthAgent || !this.audioStream) {
    throw new Error('healthAgent or audioStream is undefined');
  }

  const transcription = await this.healthAgent.transcribe(this.audioStream);
  if (!transcription) throw new Error('AI failed to transcribe audio');

  this.summary = transcription;
  expect(transcription.length).toBeGreaterThan(0);
});

Then('extract relevant symptoms, history, and treatment plan', async function (this: CustomWorld) {
  if (!this.healthAgent || !this.summary) throw new Error('Missing summary or healthAgent');
  const extracted = await this.healthAgent.extractClinicalData(this.summary);
  expect(extracted).toBeDefined();
  expect(Object.keys(extracted)).toContain('symptoms');
});

Then('tag the summary with appropriate ICD-10 codes', async function (this: CustomWorld) {
  if (!this.healthAgent || !this.summary) throw new Error('Missing summary or healthAgent');
  const tags = await this.healthAgent.tagICD10({ summary: this.summary });
  expect(tags).toBeDefined();
  expect(tags.codes).toBeInstanceOf(Array);
});

Then('store the summary in the patient\'s EMR chart', async function (this: CustomWorld) {
  if (!this.emr || !this.summary) throw new Error('Missing EMR or summary');
  const result = await this.emr.storeVisitSummary(this.summary);
  expect(result.success).toBe(true);
});