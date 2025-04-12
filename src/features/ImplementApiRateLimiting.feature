@implementApiRateLimiting @wip
Feature: Implement API Rate Limiting
  Description: 
    In order to prevent abuse of the system, the API needs to implement rate limiting to restrict the number of requests per user.

  Scenario: Successful API Rate Limiting
    Given a user makes a request to the API
    When the user has not exceeded the rate limit
    Then the request is successful and processed as expected

  Scenario: Invalid API Request
    Given a user makes a request to the API
    When the request is missing required parameters
    Then the API returns a 400 Bad Request error

  Scenario: Unauthorized API Access
    Given an unauthorized user attempts to make a request to the API
    When the user does not have the necessary permissions
    Then the API returns a 401 Unauthorized error

  Scenario: API Rate Limit Exceeded
    Given a user makes multiple requests to the API
    When the user exceeds the rate limit
    Then the API returns a 429 Too Many Requests error

  Scenario: Edge Case - Maximum API Requests
    Given a user continuously makes requests to the API
    When the user reaches the maximum number of requests allowed
    Then the API blocks further requests and returns a 429 Too Many Requests error