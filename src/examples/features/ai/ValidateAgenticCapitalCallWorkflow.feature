@validateAgenticCapitalCallWorkflow @no-browser
Feature: AI helps notify investors about capital calls
  As someone managing funds,
  I want the AI to handle investor notifications automatically,
  So that messages go out correctly and on time.

  Background:
    Given the AI can see investor records and fund agreements

  Scenario: Notify investors about a new capital call
    When I tell the AI to send a capital call notification
    Then it should write a summary of the capital call
    And make sure the summary follows all compliance rules
    And send the message to each investor
    And record each step it takes with a timestamp

  Scenario: Stop if investor info is missing
    And some investor records are incomplete
    When the AI tries to create the summary
    Then it should log an error about the missing info
    And stop and alert the administrator

  Scenario: Try again if sending fails
    And the notification service is down
    When the AI tries to send out the messages
    Then it should keep retrying with longer delays
    And log each attempt to send

  Scenario: Fix missing info and let AI continue
    And the AI failed earlier because investor data was missing
    When the missing info is added
    And the AI is told to continue
    Then it should pick up where it left off and finish everything