@wip
Feature: Prevent Hallucinated Output
    As a user of the AI system
    I want to ensure that the AI does not fabricate information
    So that I can trust the responses I receive

    Background:
        Given the AI system is trained on verified data sources

    Scenario: Avoid fabricating answers when no relevant documents are retrieved
        Given no documents are returned for the query "Enable Einstein GPT for CPQ"
        When the AI model generates a response
        Then the response should contain "I'm not sure" or a similar fallback message

    Scenario: Prevent unsupported claims in empty context
        Given the retrieved context is empty
        When the user asks "How does Copilot manage role-based access?"
        Then the AI should avoid making unsupported claims

    Scenario: Detect fabricated product names in response
        Given the retrieved documents only mention "Einstein Copilot" and "Flow Builder"
        When the user asks "What tools help automate sales processes?"
        Then the response should not mention non-existent tools like "SalesFlow AI"

    Scenario: Flag hallucinations in summarization
        Given the retrieved case data includes no SLA-related terms
        When the AI summarizes the case
        Then the summary should not mention "SLA violation" or any made-up metrics