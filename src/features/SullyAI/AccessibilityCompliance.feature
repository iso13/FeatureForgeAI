@accessibilityCompliance
Feature: Accessibility Compliance

  Scenario: Access patient summary and review notes
    Given the user logs into Sully AI
    When the user selects patient Jane Doe2
    Then the page should pass basic accessibility checks