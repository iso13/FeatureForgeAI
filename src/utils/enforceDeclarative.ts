// src/utils/enforceDeclarative.ts
/**
 * FeatureForge AI
 * Copyright (c) 2024–2025 David Tran
 * Licensed under the Business Source License 1.1
 * See LICENSE.txt for full terms
 * Change Date: January 1, 2029 (license converts to MIT)
 * Contact: davidtran@featuregen.ai
 */

// SPDX-License-Identifier: BSL-1.1

export function enforceDeclarativeSteps(content: string): string {
  let transformed = content
    // Normalize quotes
    .replace(/When I click on the '([^']+)'/gi, 'When I click on the "$1"')
    .replace(/Then I should see a '([^']+)'/gi, 'Then I should see a "$1"')
    .replace(/And I click on the '([^']+)'/gi, 'And I click on the "$1"')

    // Declarative corrections
    .replace(/When I go to the "(.*?)" page/gi, 'Given the "$1" page is displayed')
    .replace(/And I fill in the "(.*?)" with "(.*?)"/gi, 'When the user provides "$2" for "$1"')
    .replace(/And I click on the "(.*?)" button/gi, 'When the user submits the "$1" action')
    .replace(/Then I should see a confirmation message "(.*?)"/gi, 'Then a confirmation message "$1" should be displayed')
    .replace(/Then I should see an error message "(.*?)"/gi, 'Then an error message "$1" should be displayed')

    // Keyword consistency
    .replace(/When I enter a keyword in the search bar/gi, 'When I enter "nature" in the search bar')
    .replace(/Then I should see a list of images related to the keyword/gi, 'Then I should see images related to "nature"')

    // HIPAA-style section normalization → force {string} placeholders
    .replace(/When the user checks the ([A-Za-z ]+) section/gi, 'When the user checks the {string} section')
    .replace(/Then the system should display all the necessary ([A-Za-z ]+) measures/gi, 'Then the system should display all the necessary {string} measures')

    // Fix Given duplication inside Scenario
    .replace(/(Background:[\s\S]+?)((?:\n\s*Scenario:[\s\S]+?)(?=\n\s*Scenario:|\n*$))/g, (_, background, scenarios) => {
      return background + scenarios.replace(/^\s*Given\s+/gm, 'When ');
    })
    .replace(/(Background:[\s\S]*?Scenario:[^\n]*\n[\s\S]*?)(\s*)Given I am on the ([^n]+) page/gm,
      '$1$2When I navigate to the $3 page')

    // Clarify vague steps
    .replace(/Given I am viewing an image in the featured gallery/gi, 'Given I am viewing the first image in the featured gallery')
    .replace(/And I should see a confirmation message of the successful addition/gi, 'Then a confirmation message "Image saved successfully" should be displayed');

  // Rule enforcement: Warn on multiple When→Then pairs
  const scenarioRegex = /(Scenario:.*?)(?=\nScenario:|\n*$)/gs;
  let match: RegExpExecArray | null;
  while ((match = scenarioRegex.exec(transformed)) !== null) {
    const block = match[1];
    const whenCount = (block.match(/^\s*When\b/gm) || []).length;
    const thenCount = (block.match(/^\s*Then\b/gm) || []).length;

    if (whenCount > 1 && thenCount > 1) {
      console.warn(`⚠️ Detected multiple When→Then pairs in:\n  → ${block.split('\n')[0]}`);
    }
  }

  return transformed;
}