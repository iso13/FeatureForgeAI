@validateRag @weaviate @no-browser
Feature: Validate Retrieval Augmented Generation
  As an AI quality engineer
  I want the system to retrieve relevant documents and summarize them
  So that end users receive accurate, context-based responses

  Background:
    Given the document schema is created in Weaviate
    And internal documents are loaded

  Scenario: Retrieve relevant documents from vector database
    When I search with the query "reset password"
    Then the top 3 documents should be retrieved
    And the results should include content related to "password"

  Scenario: Generate summaries from retrieved context
    When I search with the query "reset password"
    Then the AI should generate a summary from the retrieved documents
    And the summary should include the phrase "reset your password"


  @banana
  Scenario: Handle missing or irrelevant results
    When I search with the query "banana unicorn"
    Then the system should avoid generating a misleading summary
    And it should prompt the user to rephrase the question