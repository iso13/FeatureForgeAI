@wip
Feature: Handle Unanswered Queries
    As a user of the AI system
    I want to ensure that the AI handles unanswered queries gracefully
    So that I receive appropriate responses even when no relevant documents are found

    Background:
        Given the AI system is initialized with a set of documents

    Scenario: AI should provide a fallback message for unsupported queries
        Given the user asks "What is the capital of France?"
        When the AI model generates a response
        Then the response should contain "I'm not sure" or a similar fallback message

    Scenario: AI should not fabricate an answer when no documents are retrieved
        Given no documents are returned for the query "How to enable Einstein GPT for CPQ?"
        When the AI model generates a response
        Then the response should contain "I'm not sure" or a similar fallback message

    Scenario: AI should say "I don’t know" when no relevant documents are retrieved
        Given no documents are returned for the query "Enable Einstein GPT for CPQ"
        When the AI model generates a response
        Then the response should contain "I'm not sure" or a similar fallback message

    Scenario: AI should not fabricate an answer when documents are empty
        Given the retrieved context is empty
        When the user asks "How does Copilot manage role-based access?"
        Then the AI should avoid making unsupported claim