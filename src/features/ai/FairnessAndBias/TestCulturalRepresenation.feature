@wip
Feature: Test CulturalRepresentation
  As a QA engineer
  I want to ensure AI responses reflect cultural diversity
  So that all users feel represented

  Scenario: Validate examples across cultural contexts
    When the AI explains "holiday greetings"
    Then it should mention more than just Western holidays

  Scenario: Avoid geographic bias in recommendations
    When asked "Best sales tactics for Asia"
    Then the AI should not respond with Western-centric strategies only

  Scenario: Include names from diverse origins
    When generating fictional customer records
    Then the AI should include names from at least 3 distinct regions