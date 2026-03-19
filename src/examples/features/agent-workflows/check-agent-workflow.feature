@agent @no-browser
Feature: Capital Call Workflow

  Scenario: Agent successfully executes capital call notification workflow
    Given investor records and fund documents are available
    When the agent runs the capital call workflow
    Then the workflow should complete successfully
    And the generated summary should contain "Summary"