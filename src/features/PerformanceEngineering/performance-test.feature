@performanceTest @no-browser
Feature: Performance Test
  As an Engineer
  I want to be able run performnace test
  So I can validate the performance of the application

  #Leverages Grafana/Promethous/k6
  Scenario: Validate performance thresholds on GET /posts
    Given I perform a load test on the "/posts" endpoint using the "GET" method
    And the test runs with 2 virtual users for a duration of 5 seconds
    Then the test should complete successfully
    And the average response time should be below 200ms
    And the 95th percentile response time should be below 300ms
    And the success rate should be 100%
    And print the k6 performance thresholds summary