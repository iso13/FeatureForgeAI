@lightHouse @wip
Feature: Lighthouse audit for Adobe Firefly

  Scenario: Firefly homepage should pass performance threshold
    Given I run a Lighthouse audit on "https://firefly.adobe.com/"
    Then the performance score should be above 80