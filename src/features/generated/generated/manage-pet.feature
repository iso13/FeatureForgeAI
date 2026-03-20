@generated @generated @generated
Feature: Manage pet
  As a business user, I want to manage pet, so that I can manage policies effectively

  Background:
    Given the user is authenticated

  Scenario: Retrieve pet details
    Given a pet is registered in the system
    When the user requests the details of the pet
    Then the system should provide the details of the pet

  Scenario: Update pet details
    Given a pet is registered in the system
    When the user updates the details of the pet
    Then the system should reflect the updated details of the pet

  Scenario: Delete pet from the system
    Given a pet is registered in the system
    When the user deletes the pet from the system
    Then the pet should no longer exist in the system

  Scenario: Retrieve non-existent pet details
    Given a pet is not registered in the system
    When the user requests the details of the pet
    Then the system should indicate that the pet does not exist