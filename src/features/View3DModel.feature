@3DModel @ARCompatibleOnly
Feature: View and interact with 3D model on web AR viewer

  Scenario: Verify interaction with 3D model
    Given the user opens the model viewer page
    When the 3D model should be visible
    Then the user interacts with the 3D model