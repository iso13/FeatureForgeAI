@3DModel @ARCompatibleOnly
Feature: View and interact with 3D model on web AR viewer

  Scenario: Verify 3D model loads and AR option is available
    Given the user opens the model viewer page
    When the 3D model should be visible
    Then the user interacts with the 3D model