@lightHouse @no-browser @wip
Feature: Lighthouse audit for Adobe

  Scenario: Firefly homepage should pass performance threshold
    Given I run a Lighthouse audit on "https://firefly.adobe.com/inspire"
    Then the performance score should be above 80