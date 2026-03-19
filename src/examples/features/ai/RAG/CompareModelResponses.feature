@wip
Feature: Compare Model Responses
    As a data scientist,
    I want to compare the responses of two models,
    So that I can evaluate their performance and grounding capabilities.

    Background:
        Given I have access to Model A and Model B
        And both models are trained on the same dataset

    Scenario: Validate Model A produces hallucinated content
        Given retrieved documents from a Salesforce case record
        When I submit the documents to Model A
        Then Model A's response should contain hallucinated content

    Scenario: Validate Model B produces more grounded responses than Model A
        Given retrieved documents from a Salesforce case record
        When I submit the documents to Model A and Model B
        Then Model B's response should reference at least one of the retrieved documents
        And Model A's response should contain hallucinated content

    Scenario: Ensure both models receive the same context
        Given a user query about "Salesforce Knowledge Article expiration"
        And retrieved documents include 3 knowledge articles
        When I submit them to Model A and Model B
        Then both models should receive identical input