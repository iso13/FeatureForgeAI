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

interface DeclarativeRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface BddViolation {
  type: "imperative" | "redundant_given" | "ui_focused" | "multiple_when_then";
  line: string;
  suggestion: string;
  scenarioName?: string;
}

export function enforceDeclarativeSteps(content: string): string {
  console.log("🔍 Enforcing declarative BDD practices...");

  const violations: BddViolation[] = [];
  let transformed = content;

  // Step 1: Transform imperative to declarative
  transformed = applyDeclarativeTransformations(transformed, violations);

  // Step 2: Fix redundant Given steps after Background
  transformed = fixRedundantGivenSteps(transformed, violations);

  // Step 3: Enforce proper Background usage
  transformed = enforceProperBackground(transformed, violations);

  // Step 4: Validate scenario structure
  validateScenarioStructure(transformed, violations);

  // Report violations
  if (violations.length > 0) {
    console.log(`⚠️ Found ${violations.length} BDD practice violations:`);
    violations.forEach((violation, index) => {
      console.log(
        `  ${index + 1}. ${violation.type.toUpperCase()}: ${violation.line}`,
      );
      console.log(`     💡 Suggestion: ${violation.suggestion}`);
    });
  } else {
    console.log("✅ All BDD practices look good!");
  }

  return transformed;
}

/**
 * Apply declarative transformations (imperative → declarative)
 */
function applyDeclarativeTransformations(
  content: string,
  violations: BddViolation[],
): string {
  const declarativeRules: DeclarativeRule[] = [
    // UI-focused → Business-focused transformations
    {
      pattern: /When I click (?:on )?(?:the )?['"]([^'"]+)['"] button/gi,
      replacement: "When the doctor needs to $1",
      description: "Convert button clicks to business needs",
    },
    {
      pattern: /When I click (?:on )?(?:the )?['"]([^'"]+)['"] link/gi,
      replacement: "When the user navigates to $1",
      description: "Convert link clicks to navigation intent",
    },
    {
      pattern: /Then (?:the )?['"]([^'"]+)['"] button should be visible/gi,
      replacement: "Then $1 functionality is available",
      description: "Convert button visibility to functionality availability",
    },
    {
      pattern:
        /Then (?:the )?['"]([^'"]+)['"] and ['"]([^'"]+)['"] buttons should be visible/gi,
      replacement: "Then $1 and $2 options are available",
      description: "Convert multiple button visibility to option availability",
    },
    {
      pattern: /Given I have (?:an? )?([^n]+) recording/gi,
      replacement: "When a $1 recording session exists",
      description: "Convert Given states to When conditions",
    },
    {
      pattern: /Given I have stopped (?:an? )?([^n]+) recording/gi,
      replacement: "When a $1 recording has been completed",
      description: "Convert Given states to When conditions",
    },
    {
      pattern: /When I fill in (?:the )?"([^"]+)" (?:field )?with "([^"]+)"/gi,
      replacement: 'When the user provides "$2" for $1',
      description: "Convert form filling to data provision",
    },
    {
      pattern:
        /When I enter "([^"]+)" in (?:the )?"([^"]+)" (?:field|input|box)/gi,
      replacement: 'When the user specifies "$1" for $2',
      description: "Convert input entry to data specification",
    },
    {
      pattern:
        /When I select "([^"]+)" from (?:the )?"([^"]+)" (?:dropdown|select|menu)/gi,
      replacement: 'When the user chooses "$1" for $2',
      description: "Convert selections to choices",
    },

    // Navigation transformations
    {
      pattern: /When I (?:go to|navigate to|visit) (?:the )?"([^"]+)" page/gi,
      replacement: "When the user accesses the $1 functionality",
      description: "Convert page navigation to feature access",
    },
    {
      pattern: /Given I am on (?:the )?"([^"]+)" page/gi,
      replacement: "Given the user has access to $1 functionality",
      description: "Convert page location to functional access",
    },

    // Assertion transformations (Then steps)
    {
      pattern:
        /Then I should see (?:a |an )?"([^"]+)" (?:message|notification)/gi,
      replacement: 'Then the system communicates "$1"',
      description: "Convert UI assertions to system communication",
    },
    {
      pattern: /Then I should see (?:the )?"([^"]+)" (?:page|screen|view)/gi,
      replacement: "Then the $1 functionality is available",
      description: "Convert page visibility to functionality availability",
    },
    {
      pattern: /Then I should be redirected to (?:the )?"([^"]+)" page/gi,
      replacement: "Then the user gains access to $1 functionality",
      description: "Convert redirects to access grants",
    },
    {
      pattern: /Then the "([^"]+)" should be (?:visible|displayed|shown)/gi,
      replacement: "Then $1 information is available",
      description: "Convert visibility to information availability",
    },

    // Authentication transformations
    {
      pattern: /When I log in with (?:valid )?credentials/gi,
      replacement: "When the user authenticates successfully",
      description: "Convert login steps to authentication",
    },
    {
      pattern: /When I enter (?:valid |correct )?username and password/gi,
      replacement: "When the user provides valid credentials",
      description: "Convert credential entry to provision",
    },

    // Form submission transformations
    {
      pattern:
        /When I (?:click |press )?(?:the )?"?(?:submit|save|create|update)"? button/gi,
      replacement: "When the user submits the information",
      description: "Convert form submission to information submission",
    },

    // Error handling transformations
    {
      pattern: /Then I should see an error message/gi,
      replacement: "Then the system indicates an issue",
      description: "Convert error message visibility to system indication",
    },
    {
      pattern: /Then an error should be (?:displayed|shown)/gi,
      replacement: "Then the system reports the problem",
      description: "Convert error display to problem reporting",
    },

    // Success handling transformations
    {
      pattern:
        /Then (?:I should see )?(?:a )?success(?:ful)? (?:message|confirmation)/gi,
      replacement: "Then the operation completes successfully",
      description: "Convert success messages to operation completion",
    },

    // Data creation/modification transformations
    {
      pattern: /When I create (?:a )?(?:new )?"?([^"]+)"?/gi,
      replacement: "When a new $1 needs to be added to the system",
      description: "Convert creation actions to business needs",
    },
    {
      pattern: /When I (?:edit|update|modify) (?:the )?"?([^"]+)"?/gi,
      replacement: "When $1 information needs to be updated",
      description: "Convert edit actions to update needs",
    },
    {
      pattern: /When I delete (?:the )?"?([^"]+)"?/gi,
      replacement: "When $1 is no longer needed in the system",
      description: "Convert delete actions to business decisions",
    },

    // Audio recording specific transformations
    {
      pattern: /When I click (?:on )?(?:the )?['"]Start Recording['"] button/gi,
      replacement: "When the doctor needs to capture consultation notes",
      description: "Convert start recording to business need",
    },
    {
      pattern: /When I click (?:on )?(?:the )?['"]Stop Recording['"] button/gi,
      replacement: "When the consultation discussion is complete",
      description: "Convert stop recording to business completion",
    },
    {
      pattern: /When I click (?:on )?(?:the )?['"]Save Recording['"] button/gi,
      replacement: "When the recorded consultation needs to be preserved",
      description: "Convert save action to preservation need",
    },
    {
      pattern:
        /When I click (?:on )?(?:the )?['"]Discard Recording['"] button/gi,
      replacement: "When the recorded consultation is not needed",
      description: "Convert discard action to business decision",
    },
    {
      pattern: /Then the audio recording should start/gi,
      replacement: "Then the consultation recording session begins",
      description: "Convert technical action to business outcome",
    },
    {
      pattern: /Then the audio recording should stop/gi,
      replacement: "Then the consultation recording session ends",
      description: "Convert technical action to business outcome",
    },
    {
      pattern:
        /Then the audio recording should be saved to the patient's profile/gi,
      replacement: "Then the consultation is preserved in the patient record",
      description: "Convert save action to business outcome",
    },
    {
      pattern: /Then the audio recording should be discarded/gi,
      replacement: "Then the consultation recording is removed",
      description: "Convert discard action to business outcome",
    },
  ];

  let transformed = content;

  declarativeRules.forEach((rule) => {
    const matches = Array.from(content.matchAll(rule.pattern));
    matches.forEach((match) => {
      violations.push({
        type: "imperative",
        line: match[0],
        suggestion: match[0].replace(rule.pattern, rule.replacement),
      });
    });

    transformed = transformed.replace(rule.pattern, rule.replacement);
  });

  return transformed;
}

/**
 * Fix redundant Given steps after Background
 */
function fixRedundantGivenSteps(
  content: string,
  violations: BddViolation[],
): string {
  const backgroundRegex = /Background:([\s\S]*?)(?=\n\s*Scenario:)/;
  const backgroundMatch = content.match(backgroundRegex);

  if (!backgroundMatch) {
    return content;
  }

  const backgroundSteps = extractStepsFromText(backgroundMatch[1]);
  let transformed = content;

  // Find scenarios and check for redundant Given steps
  const scenarioRegex =
    /(\n\s*Scenario:[^\n]*\n)([\s\S]*?)(?=\n\s*Scenario:|\n*$)/g;

  transformed = transformed.replace(
    scenarioRegex,
    (match, scenarioLine, scenarioBody) => {
      const scenarioSteps = extractStepsFromText(scenarioBody);

      // Check for Given steps that duplicate Background
      const redundantGivens = scenarioSteps.filter(
        (step) =>
          step.type === "Given" &&
          backgroundSteps.some(
            (bgStep) => bgStep.text.toLowerCase() === step.text.toLowerCase(),
          ),
      );

      redundantGivens.forEach((redundant) => {
        violations.push({
          type: "redundant_given",
          line: `Given ${redundant.text}`,
          suggestion: "Remove this Given step (already in Background)",
          scenarioName: scenarioLine.trim(),
        });
      });

      // Remove redundant Given steps
      let cleanedBody = scenarioBody;
      redundantGivens.forEach((redundant) => {
        const redundantPattern = new RegExp(
          `^\\s*Given\\s+${escapeRegex(redundant.text)}\\s*$`,
          "gm",
        );
        cleanedBody = cleanedBody.replace(redundantPattern, "");
      });

      // Convert remaining Given steps to When (since they shouldn't be there after Background)
      cleanedBody = cleanedBody.replace(/^\s*Given\s+/gm, "    When ");

      return scenarioLine + cleanedBody;
    },
  );

  return transformed;
}

/**
 * Enforce proper Background usage
 */
function enforceProperBackground(
  content: string,
  violations: BddViolation[],
): string {
  // Check if Background exists
  if (!content.includes("Background:")) {
    // If there are common Given steps across scenarios, suggest Background
    const commonGivens = findCommonGivenSteps(content);
    if (commonGivens.length > 0) {
      violations.push({
        type: "redundant_given",
        line: `Common steps found: ${commonGivens.join(", ")}`,
        suggestion:
          "Consider moving common Given steps to a Background section",
      });
    }
  }

  return content;
}

/**
 * Validate scenario structure
 */
function validateScenarioStructure(
  content: string,
  violations: BddViolation[],
): void {
  const scenarioRegex = /(Scenario:[^\n]*\n)([\s\S]*?)(?=\nScenario:|\n*$)/g;
  let match;

  while ((match = scenarioRegex.exec(content)) !== null) {
    const [, scenarioLine, scenarioBody] = match;
    const scenarioName = scenarioLine.trim();

    const steps = extractStepsFromText(scenarioBody);
    const whenSteps = steps.filter((s) => s.type === "When").length;
    const thenSteps = steps.filter((s) => s.type === "Then").length;

    // Check for multiple When→Then pairs (anti-pattern)
    if (whenSteps > 1 && thenSteps > 1) {
      violations.push({
        type: "multiple_when_then",
        line: scenarioName,
        suggestion:
          "Consider splitting into multiple scenarios (one When→Then per scenario)",
        scenarioName,
      });
    }

    // Check for UI-focused language that wasn't caught by transformations
    steps.forEach((step) => {
      const uiKeywords = [
        "click",
        "button",
        "field",
        "input",
        "dropdown",
        "menu",
        "link",
        "page",
      ];
      const hasUiKeywords = uiKeywords.some((keyword) =>
        step.text.toLowerCase().includes(keyword),
      );

      if (hasUiKeywords) {
        violations.push({
          type: "ui_focused",
          line: `${step.type} ${step.text}`,
          suggestion:
            "Consider focusing on business intent rather than UI interactions",
          scenarioName,
        });
      }
    });
  }
}

/**
 * Extract steps from text
 */
function extractStepsFromText(
  text: string,
): Array<{ type: string; text: string }> {
  const stepPattern = /^\s*(Given|When|Then|And|But)\s+(.+)$/gm;
  const steps: Array<{ type: string; text: string }> = [];
  let match;
  let lastStepType = "Given";

  while ((match = stepPattern.exec(text)) !== null) {
    const [, stepKeyword, stepText] = match;
    const stepType =
      stepKeyword === "And" || stepKeyword === "But"
        ? lastStepType
        : stepKeyword;
    lastStepType = stepType;

    steps.push({
      type: stepType,
      text: stepText.trim(),
    });
  }

  return steps;
}

/**
 * Find common Given steps across scenarios
 */
function findCommonGivenSteps(content: string): string[] {
  const scenarioRegex = /Scenario:[^\n]*\n([\s\S]*?)(?=\nScenario:|\n*$)/g;
  const allGivenSteps: string[][] = [];
  let match;

  while ((match = scenarioRegex.exec(content)) !== null) {
    const steps = extractStepsFromText(match[1]);
    const givenSteps = steps
      .filter((s) => s.type === "Given")
      .map((s) => s.text);

    if (givenSteps.length > 0) {
      allGivenSteps.push(givenSteps);
    }
  }

  if (allGivenSteps.length < 2) return [];

  // Find intersection of all Given steps
  return allGivenSteps[0].filter((step) =>
    allGivenSteps.every((scenarioSteps) =>
      scenarioSteps.some((s) => s.toLowerCase() === step.toLowerCase()),
    ),
  );
}

/**
 * Escape regex special characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Additional utility: Generate BDD quality report
 */
export function generateBddQualityReport(content: string): {
  score: number;
  issues: BddViolation[];
  recommendations: string[];
} {
  const violations: BddViolation[] = [];

  // Run validation without transforming
  validateScenarioStructure(content, violations);

  const recommendations: string[] = [];

  if (violations.some((v) => v.type === "imperative")) {
    recommendations.push(
      "Transform imperative steps to focus on business outcomes",
    );
  }

  if (violations.some((v) => v.type === "redundant_given")) {
    recommendations.push("Use Background section for common setup steps");
  }

  if (violations.some((v) => v.type === "ui_focused")) {
    recommendations.push(
      "Focus on business intent rather than UI interactions",
    );
  }

  if (violations.some((v) => v.type === "multiple_when_then")) {
    recommendations.push(
      "Split complex scenarios into focused single-purpose scenarios",
    );
  }

  // Calculate quality score (0-100)
  const maxViolations = 20; // Arbitrary baseline
  const score = Math.max(
    0,
    Math.round((1 - violations.length / maxViolations) * 100),
  );

  return {
    score,
    issues: violations,
    recommendations,
  };
}

/**
 * Quick BDD validation check
 */
export function validateBddPractices(content: string): boolean {
  const violations: BddViolation[] = [];

  // Check for common anti-patterns
  const hasBackground = content.includes("Background:");
  const hasRedundantGivens =
    !hasBackground && findCommonGivenSteps(content).length > 0;
  const hasImperativeSteps =
    /When I (?:click|fill|enter|select|go to|navigate)/i.test(content);

  if (hasRedundantGivens) {
    violations.push({
      type: "redundant_given",
      line: "Common Given steps found",
      suggestion: "Use Background section",
    });
  }

  if (hasImperativeSteps) {
    violations.push({
      type: "imperative",
      line: "Imperative language detected",
      suggestion: "Use declarative business language",
    });
  }

  return violations.length === 0;
}
