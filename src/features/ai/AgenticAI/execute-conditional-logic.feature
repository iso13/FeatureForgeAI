@wip
Feature: Execute Conditional Logic
  As an AI workflow executor
  I want to apply conditions based on context
  So that decisions reflect real-time CRM data

  Scenario: Route case to billing queue based on category
    Given the case category is "Billing"
    When the agent processes the case
    Then it should assign the case to the Billing Queue

  Scenario: Skip survey if "Do Not Email" is true
    Given the contact’s preferences include "Do Not Email"
    When follow-up logic is evaluated
    Then the agent should skip sending a survey

  Scenario: Choose SLA level based on customer tier
    Given the customer tier is "Enterprise"
    When the agent calculates SLA
    Then it should apply a 4-hour response SLA