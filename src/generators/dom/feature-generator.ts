// src/utils/dom-generator/feature-generator.ts
/**
 * Handles Gherkin feature file generation
 * Copyright (c) 2024–2025 David Tran
 */

import type {
  AnalysisResult,
  InteractiveElement,
  ScenarioTemplate,
} from "./types.js";

export class FeatureGenerator {
  generateFeature(
    analysis: AnalysisResult,
    featureName: string,
    scenarioCount: number = 5,
  ): string {
    console.log("   ENHANCED FEATURE GENERATOR ACTIVE!");
    console.log(`   Elements found: ${analysis.elements?.length || 0}`);
    console.log(`   Requested scenarios: ${scenarioCount}`);

    const tag = this.generateLowerCamelCaseTag(featureName);
    const elements = analysis.elements || [];

    // Group elements by type for better scenario organization
    const buttons = elements.filter(
      (el) =>
        el.type === "button" ||
        el.action === "click" ||
        el.text.toLowerCase().includes("button"),
    );
    const inputs = elements.filter(
      (el) =>
        el.action === "enter text in" ||
        el.type === "input" ||
        el.type === "textarea",
    );

    console.log(`   Buttons found: ${buttons.length}`);
    console.log(`   Inputs found: ${inputs.length}`);

    let scenarios: string[] = [];

    // Generate login scenarios if applicable
    if (inputs.length >= 2 && buttons.length >= 1) {
      scenarios = this.generateLoginScenarios(inputs, buttons, scenarioCount);
    }

    // Fallback scenario if no specific patterns detected
    if (scenarios.length === 0) {
      console.log(" No specific scenarios created, using generic fallback");
      scenarios.push(this.generateFallbackScenario());
    }

    return this.buildFeatureFile(tag, featureName, analysis.title, scenarios);
  }

  private generateLoginScenarios(
    inputs: InteractiveElement[],
    buttons: InteractiveElement[],
    scenarioCount: number,
  ): string[] {
    const usernameField = this.findElementByKeywords(inputs, ["username"]);
    const passwordField = this.findElementByKeywords(inputs, ["password"]);
    const loginButton = this.findElementByKeywords(buttons, ["login"]);

    // Use the provided scenarioCount instead of random generation
    console.log(` Generating exactly ${scenarioCount} scenarios as requested`);

    const allScenarios = this.getAllLoginScenarioTemplates(
      usernameField,
      passwordField,
      loginButton,
    );

    // Ensure we don't request more scenarios than available templates
    const maxAvailable = allScenarios.length;
    const actualCount = Math.min(scenarioCount, maxAvailable);

    if (scenarioCount > maxAvailable) {
      console.warn(
        `⚠️ Requested ${scenarioCount} scenarios but only ${maxAvailable} templates available. Using ${actualCount}.`,
      );
    }

    // Always include successful login scenario first (most important)
    const scenarios = [allScenarios[0].content];
    console.log(`   ✅ Added: ${allScenarios[0].name}`);

    // Add remaining scenarios up to the requested count
    if (actualCount > 1) {
      const remainingScenarios = allScenarios.slice(1);
      const selectedScenarios = remainingScenarios.slice(0, actualCount - 1);

      selectedScenarios.forEach((scenario) => {
        scenarios.push(scenario.content);
        console.log(`   ✅ Added: ${scenario.name}`);
      });
    }

    console.log(
      `🎉 Generated ${scenarios.length} scenarios (requested: ${scenarioCount})`,
    );
    return scenarios;
  }

  private findElementByKeywords(
    elements: InteractiveElement[],
    keywords: string[],
  ): InteractiveElement {
    return (
      elements.find((el) =>
        keywords.some(
          (keyword) =>
            el.text.toLowerCase().includes(keyword) ||
            el.testId?.toLowerCase().includes(keyword),
        ),
      ) || elements[0]
    );
  }

  private getAllLoginScenarioTemplates(
    usernameField: InteractiveElement,
    passwordField: InteractiveElement,
    loginButton: InteractiveElement,
  ): ScenarioTemplate[] {
    return [
      {
        name: "Successful login with valid credentials",
        content: `Scenario: Successful login with valid credentials
  When I enter "standard_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should be redirected to the products page
  And I should see the inventory list`,
      },
      {
        name: "Login fails with invalid credentials",
        content: `Scenario: Login fails with invalid credentials
  When I enter "invalid_user" in the "${this.getElementName(usernameField)}" field
  And I enter "wrong_password" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should see an error message
  And I should remain on the login page`,
      },
      {
        name: "Login validation with empty fields",
        content: `Scenario: Login validation with empty fields
  When I leave the "${this.getElementName(usernameField)}" field empty
  And I leave the "${this.getElementName(passwordField)}" field empty
  And I click the "${this.getElementName(loginButton)}" button
  Then I should see validation error messages
  And the login button should remain disabled or show error`,
      },
      {
        name: "Login attempt with locked out user",
        content: `Scenario: Login attempt with locked out user
  When I enter "locked_out_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should see a locked out error message
  And I should remain on the login page`,
      },
      {
        name: "Login with problem user account",
        content: `Scenario: Login with problem user account
  When I enter "problem_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should be logged in successfully
  But I may experience visual glitches on the products page`,
      },
      {
        name: "Login with performance user account",
        content: `Scenario: Login with performance user account
  When I enter "performance_glitch_user" in the "${this.getElementName(usernameField)}" field
  And I enter "secret_sauce" in the "${this.getElementName(passwordField)}" field
  And I click the "${this.getElementName(loginButton)}" button
  Then I should be logged in successfully
  But the page load may be slower than normal`,
      },
    ];
  }

  private generateFallbackScenario(): string {
    return `Scenario: Basic page interaction
  When I interact with the page elements
  Then the page should respond appropriately`;
  }

  private generateLowerCamelCaseTag(featureName: string): string {
    // Convert "User Authentication" to "@userAuthentication"
    const words = featureName
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
      .trim()
      .split(/\s+/) // Split on whitespace
      .filter((word) => word.length > 0);

    if (words.length === 0) return "@unknown";

    // First word lowercase, subsequent words capitalized
    const camelCase =
      words[0].toLowerCase() +
      words
        .slice(1)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join("");

    return `@${camelCase}`;
  }

  private getElementName(element: InteractiveElement): string {
    if (element.testId) {
      return element.testId.replace(/[-_]/g, " ");
    }

    if (
      element.text &&
      element.text.length > 0 &&
      element.text !== `${element.type} element`
    ) {
      return element.text.toLowerCase();
    }

    return `${element.type} element`;
  }

  private buildFeatureFile(
    tag: string,
    featureName: string,
    pageTitle: string,
    scenarios: string[],
  ): string {
    return `${tag}
Feature: ${featureName}
As a user, I want to authenticate with ${pageTitle} so that I can access the application

Background:
  Given I am on the "${pageTitle}" login page
  And the page has loaded completely

${scenarios.join("\n\n")}`;
  }

  // Public method for generating different types of scenarios (extensible)
  generateScenariosByType(
    elements: InteractiveElement[],
    type: "login" | "form" | "navigation" | "shopping",
  ): ScenarioTemplate[] {
    switch (type) {
      case "login":
        const buttons = elements.filter(
          (el) => el.type === "button" || el.action === "click",
        );
        const inputs = elements.filter(
          (el) => el.type === "input" || el.action === "enter text in",
        );
        if (inputs.length >= 2 && buttons.length >= 1) {
          return this.getAllLoginScenarioTemplates(
            inputs[0],
            inputs[1],
            buttons[0],
          );
        }
        break;

      case "form":
        return this.generateFormScenarios(elements);

      case "navigation":
        return this.generateNavigationScenarios(elements);

      case "shopping":
        return this.generateShoppingScenarios(elements);

      default:
        return [];
    }
    return [];
  }

  private generateFormScenarios(
    elements: InteractiveElement[],
  ): ScenarioTemplate[] {
    return [
      {
        name: "Successfully submit form with valid data",
        content: `Scenario: Successfully submit form with valid data
  When I fill in all required form fields with valid data
  And I click the submit button
  Then the form should be submitted successfully
  And I should see a confirmation message`,
      },
      {
        name: "Form validation with invalid data",
        content: `Scenario: Form validation with invalid data
  When I enter invalid data in form fields
  And I attempt to submit the form
  Then I should see validation error messages
  And the form should not be submitted`,
      },
    ];
  }

  private generateNavigationScenarios(
    elements: InteractiveElement[],
  ): ScenarioTemplate[] {
    return [
      {
        name: "Navigate through application sections",
        content: `Scenario: Navigate through application sections
  When I click navigation elements
  Then I should be able to access different sections
  And the application should maintain proper state`,
      },
    ];
  }

  private generateShoppingScenarios(
    elements: InteractiveElement[],
  ): ScenarioTemplate[] {
    return [
      {
        name: "Add item to shopping cart",
        content: `Scenario: Add item to shopping cart
  When I select a product
  And I click the add to cart button
  Then the item should be added to my cart
  And the cart count should update`,
      },
      {
        name: "View shopping cart contents",
        content: `Scenario: View shopping cart contents
  When I have items in my cart
  And I view the shopping cart
  Then I should see all added items
  And I should see the total price`,
      },
    ];
  }
}
