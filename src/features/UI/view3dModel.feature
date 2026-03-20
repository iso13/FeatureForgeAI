@view3DModel
Feature: View 3D Model
  As an Engineer
  I want to be able to view and interact with a 3D model on a web AR viewer
  So I can validate the model's functionality

  Scenario: Verify interaction with 3D model
    Given the user opens the model viewer page
    When the 3D model should be visible
    Then the user interacts with the 3D model