@validateGrounding @no-browser
Feature: Ensure AI Responses Are Accurate and Trustworthy
  As a user seeking help from AI,
  I want accurate answers based on real documentation,
  So that I can trust the information and solve my problem efficiently.

  Background:
    Given our document system is ready
    And helpful documents are available to search

  Scenario: Create a helpful summary from what was found
    When I search for "reset password"
    Then the AI should give me a short summary based on those documents
    And the summary should say something like "reset your password"

  Scenario: Summary should not exceed 3 sentences
    When I search for "2FA setup steps"
    Then the AI summary should be no longer than 3 sentences

  Scenario: Summary should include relevant key phrases
    When I search for "recover username"
    Then the AI summary should mention a keyword like "username assistance" or "identity verification"