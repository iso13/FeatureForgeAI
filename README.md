# FeatureForgeAI

AI-powered quality engineering platform that discovers identity, authorization, and API workflows and generates executable BDD test suites.

Designed to validate complex systems including privileged access management (PAM), identity lifecycle, and distributed microservices architectures.

Built on Cucumber, Playwright, and TypeScript.

---

## What It Does

FeatureForgeAI generates production-ready BDD feature files and step definitions through four intelligent pathways:

- **LLM Generator** – Generate features from a title and user story using OpenAI or Ollama  
- **API Flow Engine (Identity & Authorization Workflow Discovery)** – Scan OpenAPI specs, discover endpoint chains, and generate flow-aware BDD tests  
- **DOM Generator** – Analyze a live web page and generate UI scenarios from real elements  
- **Scaffolder** – Generate step definitions from existing feature files  

---

## Why This Matters

Traditional QA approaches cannot scale to modern systems with complex identity, authorization, and distributed workflows.

FeatureForgeAI shifts quality left by:

- Discovering real system behavior directly from APIs and UI  
- Generating test coverage aligned to business and security workflows  
- Enabling AI-driven validation of identity, access control, and compliance scenarios  

This transforms QA teams from manual testers into **quality architects** who design and govern AI-driven testing systems.

---

## Example: Privileged Access Workflow

FeatureForgeAI can model and validate identity security flows such as:

- Privileged access requests and approvals  
- Just-in-time (JIT) access elevation  
- Role-based access control (RBAC) validation  
- Access expiration and revocation  

```gherkin
Feature: Manage Privileged Access

  Scenario: Temporary privileged access is granted and revoked
    Given a user exists without privileged access
    And a privileged role is configured with a duration of 2 hours
    When a privileged access request is approved
    Then the user should have elevated access
    And the access should expire after 2 hours