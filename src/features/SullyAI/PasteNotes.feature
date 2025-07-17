@pasteNotes
Feature: Paste Notes
As a Doctor,
I want to add additional notes for a patient,
So that I can generate a clinical summary.

  Scenario: Add additional notes for Jane Doe2 and generate clinical summary
    Given the user logs into Sully AI
    When the user selects patient Jane Doe2 and pastes additional notes
    Then the system should generate a clinical summary