@validateConsistentImageLabeling
Feature: Validate correct image labeling
  As a Machine Learning Engineer
  I want to ensure the image classification model labels cats and dogs accurately
  So that the model predictions are reliable in production

  Scenario: Validate correct labeling for a set of cat and dog images
    Given a pre-trained image classification model for cats and dogs is loaded
    When I input a set of labeled images containing cats and dogs
    Then each image should be labeled as "cat" or "dog" with at least 50% accuracy