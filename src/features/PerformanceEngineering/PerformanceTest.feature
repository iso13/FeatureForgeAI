@performanceTest @no-browser
Feature: Performance Test
  As an Engineer
  I want to be able run performnace test
  So I can validate the performance of the application

  #Leverages Grafana/Promethous/k6

  Scenario: Perform load test on GET /posts endpoint
    Given I perform a load test on the "/posts" endpoint using the "GET" method
    And the test runs with 2 virtual users for a duration of 5 seconds
    Then the test should complete successfully
    And the average response time should be below 10ms
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