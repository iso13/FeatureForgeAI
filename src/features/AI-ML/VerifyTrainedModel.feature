@verifyTrainedModel
Feature: Verify prediction of a trained model
  As a Machine Learning Engineer
  I want to verify the output of a trained regression model
  So I can ensure the model predicts values within an acceptable error margin

  Background:
    Given a linear regression TensorFlow model has been trained to learn y = 2x - 1

  Scenario: Predict output for a known input
    When I input the value 5 into the model
    Then the predicted output should be within 0.1 of 9