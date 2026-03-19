@generated @generated @generated
Feature: Manage pet
  As a business user, I want to manage pet, so that I can manage policies effectively

  Background:
    Given the user is authenticated

  Scenario: Retrieve pet details
    Given a pet is registered in the system
    When the user retrieves the pet details
    Then the system should provide the pet details
    And the pet details should be accurate

  Scenario: Update pet details
    Given a pet is registered in the system
    When the user updates the pet details
    Then the system should confirm the pet details update
    And the updated pet details should be reflected in the system

  Scenario: Delete pet details
    Given a pet is registered in the system
    When the user deletes the pet details
    Then the system should confirm the pet details deletion
    And the pet details should no longer exist in the system

  Scenario: Retrieve pet details with invalid pet ID
    Given a pet is registered in the system
    When the user retrieves the pet details with an invalid pet ID
    Then the system should return an error message
    And the pet details should not be provided

  Scenario: Update pet details with invalid pet ID
    Given a pet is registered in the system
    When the user updates the pet details with an invalid pet ID
    Then the system should return an error message
    And the pet details should not be updated in the system