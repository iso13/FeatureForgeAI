@wip
Feature: Invoke Tool
  As a Salesforce agent assistant
  I want the AI to invoke the correct tool based on intent
  So that actions are executed efficiently

  Scenario: Trigger correct flow for account escalation
    Given the user says "Escalate this customer"
    When the AI agent parses the intent
    Then it should invoke the "EscalateAccountFlow"

  Scenario: Avoid invoking tool when confidence is low
    Given the agent's confidence is below 50%
    When deciding whether to use the "UpdatePipelineTool"
    Then it should ask for user confirmation

  Scenario: Select between multiple tools for similar intents
    Given the user says "Send onboarding email"
    When the agent detects both "MarketingEmailTool" and "TransactionalMailer"
    Then it should select the appropriate tool based on use-case context