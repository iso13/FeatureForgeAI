@wip
Feature: Manage MultiTurnInteraction
  As an AI assistant
  I want to carry context across turns
  So that I can complete user requests that span multiple prompts

  Scenario: Carry previous user intent across turns
    Given the user previously said "Schedule a meeting"
    And now says "Make it next Monday at 10am"
    Then the agent should update the meeting time accordingly

  Scenario: Disambiguate conflicting updates
    Given the user says "Create a follow-up for next week"
    And later says "Actually push it to the week after"
    Then the agent should confirm the final date before proceeding

  Scenario: Maintain topic across context switches
    Given the user asks about a contact and then about their related opportunities
    Then the agent should associate both turns with the same contact context