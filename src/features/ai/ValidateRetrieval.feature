@validateRetrieval @weaviate @no-browser
Feature: Validate Retrieval
  As someone responsible for AI quality,
  I want the system to return relevant documents for a given query,
  So that the downstream summarizer has high-quality context to work with.

  Background:
    Given our document system is ready
    And helpful documents are available to search

  Scenario: Find the most relevant documents
    When I search for "reset password"
    Then I should see the top 3 most relevant documents
    And those documents should talk about "password"

  Scenario: Create a helpful summary from what was found
    When I search for "account recovery"
    Then the AI should give me a short summary based on those documents
    And the summary should say something like "reset your password"

  Scenario: What if the AI can't find anything useful?
    When I search for "Hello Kitty"
    Then the AI should not make something up
    And it should ask me to try a different question