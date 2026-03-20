@wip
Feature: Retrieve Relevant Documents
    As a user
    I want to retrieve relevant documents from various objects
    So that I can find the information I need quickly

    Background:
        Given the user is logged in to the system

    Scenario: Retrieve relevant documents for a specific query
        Given a user asks "What are the latest updates on the Sales Cloud?"
        When the retriever fetches documents
        Then the top 3 results should include at least one document from "Sales Cloud Release Notes"

    Scenario: Retrieve relevant documents for a general query
        Given a user asks "How to create a new lead?"
        When the retriever fetches documents
        Then the top 3 results should include at least one document from "Lead Management"

    Scenario: Retrieve relevant knowledge articles for a case resolution
        Given a user asks "How to reset a customer portal password?"
        When the retriever fetches documents
        Then the top 3 results should include at least one knowledge article titled "Reset Password - Customer Portal"

    Scenario: Do not retrieve documents from unrelated objects
        Given the query is about Sales Cloud onboarding
        When retrieval is executed
        Then documents from unrelated objects like "Service Contracts" should not appear