@wip
Feature: Log DecisionTrail
  As an audit-aware Copilot
  I want to log each step in my decision process
  So that human reviewers can verify my choices

  Scenario: Log step reasoning for opportunity updates
    When the agent updates the opportunity stage
    Then it should log: "Moved to Closed Won due to signed contract"

  Scenario: Include document reference in decision log
    Given retrieved content influences an action
    Then the agent should include the source ID in the log

  Scenario: Store user prompts and parsed intents
    When the agent processes a multi-turn request
    Then each prompt and derived intent should be included in the decision log