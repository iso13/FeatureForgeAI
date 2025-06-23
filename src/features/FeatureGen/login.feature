@logIn @wip
Feature: Log In
As a tester
I want to log in to the FeatureGen application
So that I can test the login functionality

  Scenario: Successful login
    Given I am on the FeatureGen login page
    When I enter valid credentials
    Then I should be redirected to the dashboard