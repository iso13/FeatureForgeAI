@biasAudit @no-browser @ai
Feature: Model fairness across demographic attributes

  Scenario Outline: Ensure prediction parity for different groups
    Given a model is loaded
    And I input a sample with demographic group "<group>"
    When I get the model's decision
    Then the decision outcome should be within the fairness threshold

    Examples:
      | group     |
      | male      |
      | female    |
      | nonbinary |
      | asian     |
      | black     |
      | white     |
      | hispanic  |