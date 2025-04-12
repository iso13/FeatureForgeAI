@validateApplicationPerformance
Feature: Validate Application Performance
  As a Performance Engineer
  I want to run automated load tests against API endpoints
  So I can ensure the application meets response time and success rate targets

  #Leverages Grafana k6
  Scenario: Perform load test on GET /posts endpoint
    Given I initiate a load test on the "/posts" endpoint using the "GET" method
    When the test is configured to run with 2 virtual users for 5 seconds
    Then the test should complete without errors
    And the average response time should be less than 70ms
    And the success rate should be 100%

  @stressTest @wip
  Scenario: Generate a high volume of API requests to test system stability
    Given the application endpoint is "https://example.com/api/v1/resource"
    And I have a payload with valid request data
    When I send 100,000 concurrent requests to the endpoint
    Then the response time should not exceed 2000 milliseconds
    And the server should not return more than 1% of 500 error responses
    And the CPU usage should remain below 80%
    And the memory usage should remain below 75%