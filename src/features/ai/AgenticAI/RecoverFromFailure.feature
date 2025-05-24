@wip
Feature: Recover FromFailure
  As an AI assistant
  I want to handle tool or API failures gracefully
  So that the user experience is not disrupted

  Scenario: Retry execution after timeout
    Given a tool fails due to timeout
    Then the agent should retry up to 2 times before escalating

  Scenario: Inform user when system is down
    When an API call returns a 500 error
    Then the agent should respond: "I'm unable to complete that right now due to a system issue"

  Scenario: Provide fallback action for broken flow
    Given the "CreateQuoteFlow" fails unexpectedly
    Then the agent should suggest a manual option or alternate flow