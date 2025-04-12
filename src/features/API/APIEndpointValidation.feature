@apiEndpointValidation @wip
Feature: API Endpoint Validation
  As an Engineer
  I want to verify the behavior and data integrity of API endpoints
  So that I can ensure consistent and accurate responses

  Scenario: Create a user using POST and validate response data
    Given I send a POST request to "/api/users" with the following payload
      | name | John Doe          |
      | job  | Software Engineer |
    Then the response should contain the field "name" with value "John Doe"
    And the response should contain the field "job" with value "Software Engineer"

  Scenario: Retrieve user by ID using GET and validate response data
    Given I send a GET request to "/api/users/2"
    Then the response should contain the field "id" with value "2"
    And the response should contain the field "first_name" with a non-empty value
    And the response should contain the field "last_name" with a non-empty value