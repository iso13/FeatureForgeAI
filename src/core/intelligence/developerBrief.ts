// src/core/intelligence/developerBrief.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import type { FailureClassification } from './failureClassifier';
import type { LayerValidationReport } from './layerValidator';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeveloperBrief {
  id: string;
  timestamp: string;
  feature: string;
  scenario: string;
  gherkinStep: string;
  rootCause: string;
  confidence: number;
  failureLayers: string[];
  summary: string;
  errorMessage: string;
  layerAnalysis: {
    ui: { passed: boolean; evidence?: string };
    api: { passed: boolean; evidence?: string };
    businessLogic: { passed: boolean; evidence?: string };
  };
  suggestedFix: string;
  businessImpact: string;
  complianceRisk?: string;
  affectedFiles?: string[];
  stackTrace?: string;
}

// ─── AI-Powered Fix Suggestion ────────────────────────────────────────────────

async function generateFixSuggestion(
  classification: FailureClassification,
  validationReport: LayerValidationReport,
): Promise<{ fix: string; impact: string; compliance?: string }> {
  try {
    const prompt = `You are a senior software engineer analyzing a BDD test failure in a production system.

Gherkin Step: "${classification.gherkinStep}"
Scenario: "${classification.scenarioName}"
Feature: "${classification.featureName}"
Root Cause Layer: ${classification.rootCause}
Confidence: ${Math.round(classification.confidence * 100)}%
Error: "${classification.errorMessage}"

Layer Analysis:
- UI Layer: ${validationReport.ui.passed ? '✅ PASSED' : '❌ FAILED'} — ${validationReport.ui.evidence || 'no evidence'}
- API Layer: ${validationReport.api.passed ? '✅ PASSED' : '❌ FAILED'} — ${validationReport.api.evidence || 'no evidence'}
- Business Logic: ${validationReport.businessLogic.passed ? '✅ PASSED' : '❌ FAILED'} — ${validationReport.businessLogic.evidence || 'no evidence'}

Provide a JSON response with:
{
  "fix": "Specific, actionable fix suggestion (2-3 sentences max)",
  "impact": "Business impact if this remains unfixed (1-2 sentences)",
  "compliance": "Any compliance risk (HIPAA/SOC2/FDA/insurance regulations) — omit if not applicable"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content.replace(/```json|```/g, '').trim());
  } catch {
    return {
      fix: `Investigate the ${classification.rootCause} layer for the failing step: "${classification.gherkinStep}". Review the error message and stack trace for specific file and line references.`,
      impact: 'Unable to determine business impact automatically — manual review required.',
    };
  }
}

// ─── Brief Generator ──────────────────────────────────────────────────────────

/**
 * Generates a Developer Brief from a failure classification and layer validation report.
 * Writes both a JSON file (machine-readable) and returns the brief for HTML attachment.
 */
export async function generateDeveloperBrief(
  classification: FailureClassification,
  validationReport: LayerValidationReport,
): Promise<DeveloperBrief> {
  const { fix, impact, compliance } = await generateFixSuggestion(
    classification,
    validationReport,
  );

  const id = `brief-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const brief: DeveloperBrief = {
    id,
    timestamp: classification.timestamp,
    feature: classification.featureName,
    scenario: classification.scenarioName,
    gherkinStep: classification.gherkinStep,
    rootCause: classification.rootCause,
    confidence: classification.confidence,
    failureLayers: classification.failureLayers,
    summary: generateSummary(classification, validationReport),
    errorMessage: classification.errorMessage,
    layerAnalysis: {
      ui: {
        passed: validationReport.ui.passed,
        evidence: validationReport.ui.evidence,
      },
      api: {
        passed: validationReport.api.passed,
        evidence: validationReport.api.evidence,
      },
      businessLogic: {
        passed: validationReport.businessLogic.passed,
        evidence: validationReport.businessLogic.evidence,
      },
    },
    suggestedFix: fix,
    businessImpact: impact,
    complianceRisk: compliance,
    stackTrace: classification.stackTrace,
  };

  // Write JSON report
  await writeBriefToFile(brief);

  // Console output for immediate visibility
  printBriefToConsole(brief);

  return brief;
}

// ─── Summary Generator ───────────────────────────────────────────────────────

function generateSummary(
  classification: FailureClassification,
  report: LayerValidationReport,
): string {
  const layers = classification.failureLayers.join(' + ');
  const confidence = Math.round(classification.confidence * 100);

  switch (classification.rootCause) {
    case 'UI':
      return `UI element failure detected (${confidence}% confidence). The step "${classification.gherkinStep}" failed because a UI element was not found or not in the expected state. This is likely a selector change or layout update.`;

    case 'API_CONTRACT':
      return `API contract violation detected (${confidence}% confidence). The step "${classification.gherkinStep}" failed because an API endpoint returned an unexpected response. This may indicate a backend change that broke the contract.`;

    case 'BUSINESS_LOGIC':
      return `Business logic failure detected (${confidence}% confidence). The step "${classification.gherkinStep}" failed because the system returned a value that does not match the business rule. The UI and API layers appear healthy — the issue is in the calculation or rule engine.`;

    case 'DATA_LAYER':
      return `Data layer failure detected (${confidence}% confidence). The step "${classification.gherkinStep}" failed due to a database or schema issue. Check for recent migrations or schema changes.`;

    case 'FULL_STACK':
      return `Multi-layer failure detected across: ${layers} (${confidence}% confidence). The step "${classification.gherkinStep}" has failures at multiple layers — this may indicate a cascading failure from a single root change.`;

    default:
      return `Unclassified failure for step "${classification.gherkinStep}". Manual investigation required. Error: ${classification.errorMessage}`;
  }
}

// ─── File Writer ──────────────────────────────────────────────────────────────

async function writeBriefToFile(brief: DeveloperBrief): Promise<void> {
  const briefsDir = path.join(ROOT_DIR, 'reports/intelligence');
  await fs.promises.mkdir(briefsDir, { recursive: true });

  const filename = `${brief.id}.json`;
  const filepath = path.join(briefsDir, filename);

  await fs.promises.writeFile(filepath, JSON.stringify(brief, null, 2), 'utf-8');

  // Also maintain a rolling summary file
  const summaryPath = path.join(briefsDir, 'failure-summary.json');
  let summary: DeveloperBrief[] = [];

  try {
    const existing = await fs.promises.readFile(summaryPath, 'utf-8');
    summary = JSON.parse(existing);
  } catch {
    // File doesn't exist yet
  }

  summary.push(brief);

  // Keep last 50 briefs in summary
  if (summary.length > 50) summary = summary.slice(-50);

  await fs.promises.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
}

// ─── Console Output ──────────────────────────────────────────────────────────

function printBriefToConsole(brief: DeveloperBrief): void {
  const divider = '═'.repeat(70);
  const passed = (v: boolean) => (v ? '✅' : '❌');

  console.log(`\n${divider}`);
  console.log(`🔍 FEATUREFORGE AI — DEVELOPER BRIEF`);
  console.log(divider);
  console.log(`📋 Feature:    ${brief.feature}`);
  console.log(`🎯 Scenario:   ${brief.scenario}`);
  console.log(`📝 Step:       ${brief.gherkinStep}`);
  console.log(`🚨 Root Cause: ${brief.rootCause} (${Math.round(brief.confidence * 100)}% confidence)`);
  console.log(`🕐 Time:       ${brief.timestamp}`);
  console.log(divider);
  console.log(`📊 LAYER ANALYSIS`);
  console.log(`   ${passed(brief.layerAnalysis.ui.passed)} UI Layer:             ${brief.layerAnalysis.ui.evidence || 'no data'}`);
  console.log(`   ${passed(brief.layerAnalysis.api.passed)} API Layer:            ${brief.layerAnalysis.api.evidence || 'no data'}`);
  console.log(`   ${passed(brief.layerAnalysis.businessLogic.passed)} Business Logic Layer: ${brief.layerAnalysis.businessLogic.evidence || 'no data'}`);
  console.log(divider);
  console.log(`💡 SUMMARY`);
  console.log(`   ${brief.summary}`);
  console.log(divider);
  console.log(`🔧 SUGGESTED FIX`);
  console.log(`   ${brief.suggestedFix}`);
  console.log(divider);
  console.log(`⚠️  BUSINESS IMPACT`);
  console.log(`   ${brief.businessImpact}`);
  if (brief.complianceRisk) {
    console.log(divider);
    console.log(`🔒 COMPLIANCE RISK`);
    console.log(`   ${brief.complianceRisk}`);
  }
  console.log(divider);
  console.log(`📁 Brief saved to: reports/intelligence/${brief.id}.json`);
  console.log(`${divider}\n`);
}

// ─── HTML Attachment Generator ────────────────────────────────────────────────

/**
 * Generates an HTML string for attaching to the Cucumber HTML report.
 * Call this.attach(html, 'text/html') in the After hook.
 */
export function generateBriefHTML(brief: DeveloperBrief): string {
  const layerRow = (
    label: string,
    result: { passed: boolean; evidence?: string },
  ) => `
    <tr style="background: ${result.passed ? '#f0fff4' : '#fff5f5'}">
      <td style="padding: 8px; font-weight: bold; color: ${result.passed ? '#276749' : '#c53030'}">${result.passed ? '✅' : '❌'} ${label}</td>
      <td style="padding: 8px; color: #4a5568">${result.evidence || 'No evidence captured'}</td>
    </tr>`;

  return `
<div style="font-family: monospace; border: 2px solid #e53e3e; border-radius: 8px; padding: 16px; margin: 8px 0; background: #fff">
  <h3 style="color: #c53030; margin: 0 0 12px 0">🔍 FeatureForge AI — Developer Brief</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px">
    <tr><td style="padding: 4px; color: #718096; width: 140px">Root Cause</td><td style="padding: 4px; font-weight: bold; color: #c53030">${brief.rootCause} (${Math.round(brief.confidence * 100)}% confidence)</td></tr>
    <tr><td style="padding: 4px; color: #718096">Failed Step</td><td style="padding: 4px">${brief.gherkinStep}</td></tr>
    <tr><td style="padding: 4px; color: #718096">Layers Affected</td><td style="padding: 4px">${brief.failureLayers.join(', ')}</td></tr>
  </table>
  <h4 style="color: #2d3748; margin: 12px 0 6px 0">Layer Analysis</h4>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0">
    ${layerRow('UI Layer', brief.layerAnalysis.ui)}
    ${layerRow('API Layer', brief.layerAnalysis.api)}
    ${layerRow('Business Logic', brief.layerAnalysis.businessLogic)}
  </table>
  <h4 style="color: #2d3748; margin: 12px 0 6px 0">Summary</h4>
  <p style="color: #4a5568; margin: 0 0 12px 0">${brief.summary}</p>
  <h4 style="color: #2d3748; margin: 12px 0 6px 0">💡 Suggested Fix</h4>
  <p style="color: #276749; background: #f0fff4; padding: 8px; border-radius: 4px; margin: 0 0 12px 0">${brief.suggestedFix}</p>
  <h4 style="color: #2d3748; margin: 12px 0 6px 0">⚠️ Business Impact</h4>
  <p style="color: #c05621; background: #fffaf0; padding: 8px; border-radius: 4px; margin: 0 0 12px 0">${brief.businessImpact}</p>
  ${brief.complianceRisk ? `
  <h4 style="color: #2d3748; margin: 12px 0 6px 0">🔒 Compliance Risk</h4>
  <p style="color: #c53030; background: #fff5f5; padding: 8px; border-radius: 4px; margin: 0">${brief.complianceRisk}</p>` : ''}
  <p style="color: #a0aec0; font-size: 11px; margin: 12px 0 0 0">Brief ID: ${brief.id} | ${brief.timestamp}</p>
</div>`;
}