@agent @capitalCall @no-browser
Feature: Capital Call Agent Workflow
  As a system
  I want to simulate the investor notification process
  So that I can ensure the CapitalCallAgent behaves correctly

  Scenario: Successful capital call notification
    Given investor records and fund documents are available
    When the agent runs the capital call workflow
    Then the workflow should complete successfully
    And the generated summary should contain "Summary generated"