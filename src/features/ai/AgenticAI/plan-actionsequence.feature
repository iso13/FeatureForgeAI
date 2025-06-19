@wip
Feature: Plan ActionSequence
  As an AI Copilot
  I want to plan a sequence of steps to complete a user request
  So that complex business tasks are executed correctly

  Scenario: Plan multiple steps for lead conversion
    Given the user says "Convert this lead and assign to sales"
    When the AI agent receives the request
    Then it should plan the steps: [Create Contact, Create Opportunity, Assign Owner]

  Scenario: Validate step ordering
    When the user requests "Schedule demo and send follow-up"
    Then the AI agent should plan to schedule the demo before sending follow-up

  Scenario: Skip unnecessary steps for simple requests
    Given the user says "Update opportunity name"
    Then the agent should plan only one action: [Update Field]