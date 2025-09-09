# 🧭 BDD Principles & Cucumber Best Practices

This guide outlines the core principles of Behavior-Driven Development (BDD) and practical conventions for implementing BDD with **Cucumber + TypeScript** in a modern test automation framework.

---

## 🧱 Core BDD Principles

### 1. Business-Readable Specifications
Use **Gherkin syntax** to describe system behavior in plain language that stakeholders can understand.

### 2. Shared Understanding
Promote cross-functional collaboration between **Product, QA, and Engineering** to define behavior early and continuously.

### 3. Executable Specifications
All `.feature` files must map to working **step definitions** in TypeScript. These act as **living documentation** that validates expected behavior.

### 4. Declarative Over Imperative
Describe **what** the system should do, not **how** the user interacts with it. Avoid implementation details in Gherkin steps.

---

## 🔁 BDD Lifecycle

1. **Discovery** – Collaboratively define Features and Scenarios before implementation  
2. **Formulation** – Write Gherkin `.feature` files and scaffold step definitions  
3. **Automation** – Implement steps in TypeScript using Playwright or API helpers  
4. **Validation** – Integrate with CI/CD pipelines for continuous quality feedback  
5. **Living Documentation** – Keep features current as the system evolves

---

## 🥒 Cucumber Best Practices

### 🏷 Feature File Conventions

| Element              | Guideline                                                                 |
|----------------------|---------------------------------------------------------------------------|
| **Title**            | Use `Verb Noun` format (e.g., `Bind Homeowners Policy`)                   |
| **Feature Tag**      | Tag each Feature with `@<featureTitle>` in **lowerCamelCase**             |
| **@wip Tag**         | Use `@wip` for any Feature or Scenario not ready for CI/CD                |
| **Background**       | Use only for shared setup steps across all Scenarios                      |
| **Scenario Outline** | Use for tabular data-driven examples                                      |
| **Atomic Scope**     | Keep Scenarios focused—**1 user story, 1 expected outcome**               |

---

### ✍️ Example: Tagged & Declarative Feature

```gherkin
@bindHomeownersPolicy @wip
Feature: Bind Homeowners Policy
  As an underwriter
  I want to bind a policy after assessing risk
  So that the applicant receives active coverage

  Background:
    Given the underwriter is logged into the risk assessment dashboard

  Scenario: Bind policy for a low-risk applicant
    When the underwriter completes the risk assessment for a low-risk profile
    Then a new homeowners policy is created
    And the policy status is set to "Active"

  Scenario Outline: Bind policy based on risk score
    When the underwriter evaluates a risk score of <score>
    Then the policy decision is <decision>

    Examples:
      | score | decision |
      | 250   | Declined |
      | 650   | Approved |